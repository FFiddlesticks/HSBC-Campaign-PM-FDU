import os
from typing import List, Dict, Any
from dataclasses import dataclass, asdict
from pdf2image import convert_from_path
import img2pdf
import dashscope
import openai
import json
from typing import List

@dataclass
class OCRResult:
    """
    保存OCR解析结果的结构体
    
    Attributes:
        page: int - 页码（从1开始）
        content: str - 页面的OCR文本内容
    """
    page: int
    content: str

    def to_dict_string(self):
        return f"{{'page': {self.page}, 'content': '{self.content}'}}"

def pdf2image(input_file: str, output_dir: str = None) -> List[str]:
    """
    Convert a PDF file to a series of images.

    Args:
        input_file (str): The path to the input PDF file.

    Returns:
        None
    """
    # check if input_file path is a absolute path
    if not os.path.isabs(input_file):
        input_file = os.path.abspath(input_file)
    if output_dir is None:
        image_dir = os.path.join(os.path.dirname(input_file), "images")
    else:
        image_dir = output_dir
    os.makedirs(image_dir, exist_ok=True)
    ret = []
    # 创建临时目录存放图片
    images = convert_from_path(input_file)
    for i, image in enumerate(images):
        img_path = os.path.join(image_dir, f"page_{i}.jpg")
        image.save(img_path, "JPEG")
        ret.append(img_path)

    return ret

def image2pdf(images: List[str], output_file: str) -> None:
    """
    Convert a series of images to a PDF file.

    Args:
        images (List[str]): The list of image paths.
        output_file (str): The path to the output PDF file.

    Returns:
        None
    """
    with open(output_file, "wb") as f:
        f.write(img2pdf.convert(images))

def ocr_parse(input_file: str, timeout: int = 30) -> str:
    """
    Parse the OCR text from the images.

    Args:
        input_file (str): The path to the input PDF file.

    Returns:
        None
    """
    
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is required")

    client = dashscope.MultiModalConversation()
    client.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'
    client.api_key = api_key
    messages = [
        {
            "role": "user",
            "content": [
                {
                    "image": f"{input_file}",
                    "min_pixels": 28 * 28 * 4,
                    "max_pixels": 28 * 28 * 8192,
                },
                {
                    "text": "请解析出图片中的文本"
                }
            ]
        }
    ]

    try:
        response = client.call(
            messages=messages,
            api_key=client.api_key,
            model="qwen-vl-ocr")
        if response.status_code == 200:
            return response["output"]["choices"][0]["message"].content[0]["text"]
    except KeyboardInterrupt:
        print("OCR interrupted by user.")
    except Exception as e:
        print(f"OCR error: {e}")
    return ""

def content_structure(content: str) -> str:
    """
    Structure the OCR text.

    Args:
        content (str): The OCR text.

    Returns:
        None
    """
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")

        client = openai.OpenAI(
            api_key=api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )

        fields_description = """
        每个文档包含以下字段：
        - title: 文档标题
        - id: 文档编号
        - type: 文档分类
        - pages: 该文档包含的页码列表
        - customer_name: 客户名称
        - guarantor_name: 担保人/保证人/出质人(可选)
        - sign_date: 签署日期(YYYY-MM-DD格式)
        - deadline: 截止日期(YYYY-MM-DD格式)(可选)
        """
        messages = [
            {
                "role": "system",
                "content": "你是一个专业的文档分析助手，负责解析包含多个文档的文本内容。你需要根据内容识别出不同的文档，将页面正确地分配到各个文档中，并提取每个文档的结构化信息。最终只返回JSON数组数据，不返回其他任何内容。"
            },
            {
                "role": "user",
                "content": f"""
请分析以下包含多个页面的文档内容，识别出其中包含的不同文档，并为每个文档提取结构化信息。
{fields_description}

识别文档的指导原则：
1. 总共有5种类型的文件，分别是：安慰函，保证金担保合同，个人保证书，公司保证书，应收账款质押协议
2. 根据文档标题、编号、客户名称等关键信息来区分不同的文档
3. 连续的页面通常属于同一个文档，但也要注意内容的变化
4. 同一个文档的页面应该在内容上具有连续性
5. 如果发现明显不同的文档类型或客户，应该分开处理

输入数据格式：
[
  {{"page": 1, "content": "页面1内容"}},
  {{"page": 2, "content": "页面2内容"}},
  ...
]
期望输出格式：
[
  {{
    "title": "文档标题1",
    "id": "文档编号1",
    "type": "安慰函",
    "pages": [1, 2, 3],
    "customer_name": "客户A",
    "guarantor_name": "",
    "sign_date": "2023-01-01",
    "deadline": "2023-01-31"
  }},
  {{
    "title": "文档标题2", 
    "id": "文档编号2",
    "type": "保证金担保合同",
    "pages": [4, 5],
    "customer_name": "客户B",
    "guarantor_name": "担保人B",
    "sign_date": "2024-01-01",
    "deadline": "2025-01-31"
  }}
]

现在请分析以下页面内容：
{content}
请仔细分析内容，正确识别不同的文档，并将页面分配到对应的文档中。
                """
            }
        ]
        completion = client.chat.completions.create(
            model="qwen-plus",
            messages=messages,
        )
        result = completion.choices[0].message.content
        if result:
            json_data = json.loads(result)
            if not isinstance(json_data, list):
                json_data = [json_data]

        return json.dumps(json_data, ensure_ascii=False, indent=4)
    except Exception as e:
        print(e)
        return "[]"


def _prepare_dirs(input_file: str) -> tuple[str, str, str]:
    """准备输入、图片、输出目录并返回绝对路径与两个目录路径。"""
    input_file = os.path.abspath(input_file)
    root_dir = os.path.dirname(input_file)
    image_dir = os.path.join(root_dir, "images")
    pdf_dir = os.path.join(root_dir, "pdfs")
    os.makedirs(image_dir, exist_ok=True)
    os.makedirs(pdf_dir, exist_ok=True)
    return input_file, image_dir, pdf_dir


import concurrent.futures
def _ocr_single_image(page_num: int, image_path: str) -> OCRResult:
    """对单张图片进行 OCR，返回 OCRResult。"""
    content = ocr_parse(image_path)
    return OCRResult(page=page_num, content=content)

def _ocr_images(images: List[str]) -> List[OCRResult]:
    """对图片列表并行进行 OCR，返回 OCRResult 列表。"""
    ocr_results = []
    with concurrent.futures.ThreadPoolExecutor() as executor:
        # 提交所有任务
        futures = [
            executor.submit(_ocr_single_image, page_num, image_path)
            for page_num, image_path in enumerate(images, start=0)
        ]
        # 收集结果
        for future in concurrent.futures.as_completed(futures):
            try:
                ocr_results.append(future.result())
            except Exception as e:
                print(f"OCR 处理失败: {e}")
    # 按页码排序
    ocr_results.sort(key=lambda x: x.page)
    return ocr_results


def _build_content_json(ocr_results: list[OCRResult]) -> str:
    """将 OCRResult 列表拼接成 content_structure 所需的 JSON 字符串。"""
    return "[" + ", ".join(r.to_dict_string() for r in ocr_results) + "]"


def _generate_filename(doc: dict) -> str:
    """根据文档类型生成合规文件名，若无法识别返回空字符串。"""
    mapping = {
        "安慰函": "{customer}_{type}_{date}.pdf",
        "保证金担保合同": "{customer}_{type}_{date}_{guarantor}.pdf",
        "个人保证书": "{customer}_{type}_{date}_{guarantor}.pdf",
        "公司保证书": "{customer}_{type}_{date}_{guarantor}.pdf",
        "应收账款质押协议": "{customer}_{type}_{date}.pdf",
    }
    tmpl = mapping.get(doc["type"])
    if not tmpl:
        doc["type"] = "unknown"
        return ""
    return tmpl.format(
        customer=doc["customer_name"],
        type=doc["type"],
        date=doc["sign_date"],
        guarantor=doc.get("guarantor_name", ""),
    )


def parse_pdf(input_file: str) -> str:
    """
    将 PDF 按页 OCR 后结构化，并依据类型拆分输出独立 PDF。

    Args:
        input_file (str): 输入 PDF 绝对路径或相对路径。

    Returns:
        str: 结构化 JSON 字符串。
    """
    input_file, image_dir, pdf_dir = _prepare_dirs(input_file)

    # PDF 转图片
    try:
        images = pdf2image(input_file, image_dir)
    except Exception as e:
        print(f"PDF rendering failed: {e}")
        return ""

    if not images:
        print("No images generated")
        return ""

    # OCR 识别
    ocr_results = _ocr_images(images)

    # 结构化
    content_json = _build_content_json(ocr_results)
    structured = content_structure(content_json)
    if not structured:
        return ""

    docs = json.loads(structured)
    for doc in docs:
        filename = _generate_filename(doc)
        if not filename:
            continue

        # 收集对应页面图片
        page_images = [images[i] for i in doc["pages"] if 0 <= i < len(images)]
        if not page_images:
            continue

        pdf_path = os.path.join(pdf_dir, filename)
        image2pdf(page_images, pdf_path)

    return structured