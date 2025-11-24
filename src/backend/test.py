import model
import argparse
import os
import json
import pandas as pd
from typing import Dict, List, Any, Tuple

def test_ocr_parse():
    model.ocr_parse("test.pdf")

def test_content_structure():
    ret = model.content_structure("test.txt")
    print(ret)

def test_parse_pdf(pdf_path: str):
    ret = model.parse_pdf(pdf_path)
    print(ret)

# 标准化日期格式函数 - 转换为YYYY-MM-DD格式
def normalize_date(date_str):
    if not date_str:
        return ''
    
    import re
    from datetime import datetime
    
    # 预处理
    date_str = str(date_str).strip()
    
    # 1. 处理带有时分秒的日期时间格式，如"2024-09-10 00:00:00"
    datetime_match = re.search(r'(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\s+\d{1,2}:\d{2}:\d{2}', date_str)
    if datetime_match:
        year, month, day = datetime_match.groups()
        month = month.zfill(2)
        day = day.zfill(2)
        return f"{year}-{month}-{day}"
    
    # 2. YYYY-MM-DD 或 YYYY/MM/DD 或 YYYY.MM.DD
    match = re.search(r'(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})', date_str)
    if match:
        year, month, day = match.groups()
        # 确保月和日是两位数
        month = month.zfill(2)
        day = day.zfill(2)
        return f"{year}-{month}-{day}"
    
    # 3. DD/MM/YYYY 或 DD-MM-YYYY 或 DD.MM.YYYY
    match = re.search(r'(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})', date_str)
    if match:
        day, month, year = match.groups()
        month = month.zfill(2)
        day = day.zfill(2)
        return f"{year}-{month}-{day}"
    
    # 4. 中文格式如：2024年12月31日
    match = re.search(r'(\d{4})年(\d{1,2})月(\d{1,2})日?', date_str)
    if match:
        year, month, day = match.groups()
        month = month.zfill(2)
        day = day.zfill(2)
        return f"{year}-{month}-{day}"
    
    # 5. 如果没有识别出标准格式，尝试使用datetime解析
    try:
        # 尝试几种常见格式
        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d', '%d-%m-%Y', '%m-%d-%Y']:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime('%Y-%m-%d')
            except ValueError:
                continue
    except Exception:
        pass
    
    # 如果无法解析，返回处理后的原始字符串
    date_str = date_str.replace('/', '-').replace('.', '-')
    return date_str

def compare_fields(expected: Dict[str, Any], actual: Dict[str, Any]) -> Tuple[bool, Dict[str, Tuple[Any, Any]]]:
    """比较预期字段和实际解析字段，返回是否完全匹配及不匹配字段详情"""
    mismatches = {}
    
    # 客户名匹配 - 去除空白字符后比较
    if 'customer_name' in expected and expected['customer_name']:
        expected_customer = str(expected['customer_name']).strip()
        actual_customer = str(actual.get('customer_name', '')).strip()
        if expected_customer and expected_customer != actual_customer:
            mismatches['customer_name'] = (expected_customer, actual_customer)
    
    # 文件类别匹配 - 支持模糊匹配某些可能的变体
    if 'type' in expected and expected['type']:
        expected_type = str(expected['type']).strip()
        actual_type = str(actual.get('type', '')).strip()
        # 处理可能的类型名称变体
        type_variants = {
            '应收帐款质押协议': ['应收帐款质押协议', '应收账款质押协议'],
            '保证金担保合同': ['保证金担保合同', '保证金合同'],
            '个人保证书': ['个人保证书', '个人保证'],
            '公司保证书': ['公司保证书', '公司保证'],
            '安慰函': ['安慰函', '保函']
        }
        
        if expected_type:
            # 检查是否有匹配的变体
            match_found = False
            if expected_type in type_variants:
                for variant in type_variants[expected_type]:
                    if variant in actual_type or actual_type in variant:
                        match_found = True
                        break
            # 如果没有定义变体或者变体匹配失败，则使用精确匹配
            if not match_found and expected_type != actual_type:
                mismatches['type'] = (expected_type, actual_type)
    
    # 签署日匹配 - 标准化日期格式后比较
    if 'sign_date' in expected and expected['sign_date']:
        expected_date = normalize_date(expected['sign_date'])
        actual_date = normalize_date(actual.get('sign_date', ''))
        if expected_date and expected_date != actual_date:
            mismatches['sign_date'] = (expected['sign_date'], actual.get('sign_date'))
    
    # 到期日匹配（不同文件类型可能不存在）
    if 'deadline' in expected and expected['deadline']:
        expected_deadline = normalize_date(expected['deadline'])
        actual_deadline = normalize_date(actual.get('deadline', ''))
        # 只在预期到期日非空时比较
        if expected_deadline and expected_deadline != actual_deadline:
            mismatches['deadline'] = (expected['deadline'], actual.get('deadline'))
    
    # 担保人/保证人匹配（不同文件类型可能不存在）
    if 'guarantor_name' in expected and expected['guarantor_name']:
        expected_guarantor = str(expected['guarantor_name']).strip()
        actual_guarantor = str(actual.get('guarantor_name', '')).strip()
        # 只在预期担保人名非空时比较
        if expected_guarantor and expected_guarantor != actual_guarantor:
            mismatches['guarantor_name'] = (expected_guarantor, actual_guarantor)
    
    return len(mismatches) == 0, mismatches

def test_many_pdfs(pdf_folder: str, xlsx_path: str):
    """
    测试多个PDF文件的解析效果，并与xlsx记录对比
    
    Args:
        pdf_folder: PDF文件所在文件夹路径
        xlsx_path: 包含预期字段的xlsx文件路径
    """
    # 读取xlsx文件
    try:
        df = pd.read_excel(xlsx_path)
        print(f"成功读取xlsx文件，共{len(df)}条记录")
    except Exception as e:
        print(f"读取xlsx文件失败: {e}")
        return
    df = df.fillna("").replace({pd.NaT: ""})
    df = df.applymap(lambda x: "" if pd.isna(x) else x)
    # 初始化统计变量
    total_files = 0
    success_count = 0
    failed_files = []
    
    # 获取文件夹中的所有PDF文件
    pdf_files = [f for f in os.listdir(pdf_folder) if f.lower().endswith('.pdf')]
    print(f"在文件夹中找到{len(pdf_files)}个PDF文件")
    
    # 遍历PDF文件
    for pdf_file in pdf_files:
        total_files += 1
        pdf_path = os.path.join(pdf_folder, pdf_file)
        print(f"\n处理文件: {pdf_file}")
        
        # 查找对应xlsx记录
        file_record = None
        for _, row in df.iterrows():
            print(row)
            # 假设xlsx中有一个'文件名'或类似的列
            if '文件名' in row and pdf_file in str(row['文件名']):
                file_record = row.to_dict()
                break
            elif '文件' in row and pdf_file in str(row['文件']):
                file_record = row.to_dict()
                break
        
        if not file_record:
            print(f"警告: 在xlsx中未找到{pdf_file}的记录")
            failed_files.append({
                'file': pdf_file,
                'reason': 'xlsx中未找到对应记录',
                'actual_result': None
            })
            continue
        # 处理日期字段 - 现在安全了，因为NaN/NaT已被替换
        sign_date = file_record.get('签署日', '')
        deadline = file_record.get('到期日', '')
        # 构建预期字段
        # 如果sign_date是Timestamp对象，则格式化；如果是空字符串，则保持不变
        if sign_date and isinstance(sign_date, pd.Timestamp):
            sign_date = sign_date.strftime("%Y-%m-%d")
        # 同理处理deadline
        if deadline and isinstance(deadline, pd.Timestamp):
            deadline = deadline.strftime("%Y-%m-%d")
        
        expected_fields = {
            'customer_name': file_record.get('客户名', ''),
            'type': file_record.get('文件类别', ''),
            'sign_date': sign_date,
            'deadline': deadline,
            'guarantor_name': file_record.get('担保人/保证人', '')
        }
        
        # 解析PDF
        try:
            result_str = model.parse_pdf(pdf_path)
            if not result_str:
                print(f"解析失败: 未返回结果")
                failed_files.append({
                    'file': pdf_file,
                    'reason': '解析未返回结果',
                    'actual_result': None
                })
                continue
            print(result_str)
            result = json.loads(result_str)
            if not result or not isinstance(result, list):
                print(f"解析失败: 返回格式错误")
                failed_files.append({
                    'file': pdf_file,
                    'reason': '返回格式错误',
                    'actual_result': result
                })
                continue
            
            # 假设每个文件只解析出一个文档
            actual_doc = result[0] if len(result) > 0 else {}
            
            # 比较字段
            is_match, mismatches = compare_fields(expected_fields, actual_doc)
            
            if is_match:
                success_count += 1
                print(f"✓ 解析成功，所有关键字段匹配")
            else:
                print(f"✗ 解析失败，字段不匹配:")
                for field, (expected, actual) in mismatches.items():
                    print(f"  - {field}: 预期='{expected}', 实际='{actual}'")
                failed_files.append({
                    'file': pdf_file,
                    'reason': '字段不匹配',
                    'mismatches': mismatches,
                    'actual_result': actual_doc
                })
                
        except Exception as e:
            print(f"解析过程出错: {e}")
            failed_files.append({
                'file': pdf_file,
                'reason': f'解析异常: {str(e)}',
                'actual_result': None
            })
    
    # 计算成功率
    success_rate = (success_count / total_files * 100) if total_files > 0 else 0
    
    # 输出总结
    print(f"\n{'='*50}")
    print(f"测试总结:")
    print(f"总文件数: {total_files}")
    print(f"成功文件数: {success_count}")
    print(f"失败文件数: {len(failed_files)}")
    print(f"成功率: {success_rate:.2f}%")
    
    # 输出失败文件详情
    if failed_files:
        print(f"\n失败文件详情:")
        for i, fail_info in enumerate(failed_files, 1):
            print(f"\n{i}. 文件: {fail_info['file']}")
            print(f"   原因: {fail_info['reason']}")
            if 'mismatches' in fail_info:
                print("   不匹配字段:")
                for field, (expected, actual) in fail_info['mismatches'].items():
                    print(f"     - {field}: 预期='{expected}', 实际='{actual}'")
    print(f"{'='*50}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Test PDF parsing")
    parser.add_argument("--pdf_path", type=str, help="Path to a single PDF file to test")
    parser.add_argument("--pdf_folder", type=str, help="Path to folder containing PDF files to test")
    parser.add_argument("--xlsx_path", type=str, help="Path to xlsx file with expected fields")
    args = parser.parse_args()
    
    if args.pdf_path:
        test_parse_pdf(args.pdf_path)
    elif args.pdf_folder and args.xlsx_path:
        test_many_pdfs(args.pdf_folder, args.xlsx_path)
    else:
        print("请提供 --pdf_path 参数测试单个文件，或同时提供 --pdf_folder 和 --xlsx_path 参数测试多个文件")
