import { useState } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { message, Upload, Modal, Form, Input, Select, DatePicker, Button, Spin, Row, Col } from 'antd';

const { Dragger } = Upload;
const { Option } = Select;

function UploadPage() {
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    // 智能分割相关状态
    const [splitting, setSplitting] = useState(false);
    const [splitFiles, setSplitFiles] = useState<Array<any>>([]);

    // parser 上传器的文件列表（允许从拆分区导入）
    const [parserFileList, setParserFileList] = useState<any[]>([]);
    const [form] = Form.useForm();
    const [editingFile, setEditingFile] = useState<any>(null);

    const showTagModalWith = (fileName: string, extras: any = {}, fileObj: any = null) => {
        // 模拟自动识别结果
        const fakeResult = {
            originalFileName: fileName,
            fileId: `F-${Date.now()}`,
            customerName: '',
            pledgor: '',
            debtor: '',
            fileType: '其他',
            signDate: null,
            expiryDate: null,
        };
        // 模拟自动识别结果合并
        Object.assign(fakeResult, extras);
        const suggestedName = generateSuggestedName(fakeResult.customerName, fakeResult.fileType, fakeResult.signDate);
        form.setFieldsValue({ ...fakeResult, suggestedName });
        setEditingFile(fileObj || { name: fileName, uid: null });
        setModalVisible(true);
    };

    const parserProps: UploadProps = {
        name: 'file',
        multiple: true,
        // 本地模拟上传：在 progress 后返回 success（不调用后端）。
        // 当接入真实后端时，删除 customRequest 或替换为后端调用。
        customRequest: (options: any) => {
            // 模拟上传进度
            const { file, onSuccess, onProgress } = options;
            console.log('Simulating upload for', file?.name ?? file);
            let percent = 0;
            const iv = setInterval(() => {
                percent += 20;
                try { onProgress && onProgress({ percent }, file); } catch (e) { /* ignore */ }
                if (percent >= 100) {
                    clearInterval(iv);
                    setTimeout(() => { try { onSuccess && onSuccess('ok'); } catch (e) { /* ignore */ } }, 150);
                }
            }, 120);
        },

        onChange(info) {
            const { status } = info.file;
            if (status !== 'uploading') {
                console.log(info.file, info.fileList);
            }
            if (status === 'done') {
                // 功能：将上传的文件加入受控的 parser 列表并通知用户
                message.success(`${info.file.name} 文件上传成功，已加入解析队列。`);
                setParserFileList(info.fileList);
            } else if (status === 'error') {
                message.error(`${info.file.name} 文件上传失败。`);
            }
        },

        onDrop(e) {
            console.log('Dropped files', e.dataTransfer.files);
        },
        
        // 文件类型限制
        beforeUpload(file) {
            const isPdf = file.type === 'application/pdf' || 
                         file.name.toLowerCase().endsWith('.pdf');
            
            if (!isPdf) {
                message.warning('只能上传PDF文件！');
                return Upload.LIST_IGNORE;
            }
            return true;
        },
        
        accept: '.pdf',
        
        // 显示上传状态
        showUploadList: {
            showRemoveIcon: true,
        },
    };

    // 智能拆分上传器
    const splitProps: UploadProps = {
        name: 'file',
        multiple: true,
        customRequest: (options: any) => {
            // 模拟上传进度
            const { file, onSuccess, onProgress } = options;
            let percent = 0;
            const iv = setInterval(() => {
                percent += 25;
                try { onProgress && onProgress({ percent }, file); } catch (e) {}
                if (percent >= 100) {
                    clearInterval(iv);
                    setTimeout(() => onSuccess && onSuccess('ok'), 150);
                }
            }, 150);
        },

        onChange(info) {
            const { status } = info.file;
            if (status === 'done') {
                message.success(`${info.file.name} 上传成功，开始智能分页`);
                setSplitting(true);

                // 功能：模拟后端拆分：创建2-4个假分段
                const parts = Math.max(2, Math.floor(Math.random() * 4) + 1);
                setTimeout(() => {
                    const results: any[] = [];
                    const totalPages = Math.max(6, Math.floor(Math.random() * 20) + 6);
                    const pagesPerPart = Math.max(1, Math.floor(totalPages / parts));
                    let currentStart = 1;
                    for (let i = 1; i <= parts; i++) {
                        const start = currentStart;
                        const end = (i === parts) ? totalPages : Math.min(totalPages, currentStart + pagesPerPart - 1);
                        currentStart = end + 1;
                        const partName = `${info.file.name.replace(/\.pdf$/i, '')}_part_${i}.pdf`;
                        const blob = new Blob([`This is simulated split ${i} of ${info.file.name} (pages ${start}-${end})`], { type: 'application/pdf' });
                        const fileObj = new File([blob], partName, { type: 'application/pdf' });
                        const url = URL.createObjectURL(blob);
                        results.push({ id: `${Date.now()}-${i}`, name: partName, size: blob.size, file: fileObj, url, pages: { start, end } });
                    }
                    setSplitFiles(results);
                    setSplitting(false);
                    message.success('智能拆分完成，已生成分段预览');
                }, 3000);
            } else if (status === 'error') {
                message.error(`${info.file.name} 上传失败。`);
            }
        },

        beforeUpload(file) {
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            if (!isPdf) {
                message.warning('只能上传PDF文件！');
                return Upload.LIST_IGNORE;
            }
            return true;
        },

        accept: '.pdf',

        showUploadList: {
            showRemoveIcon: true,
        },
    };

    const handleCancel = () => {
        setModalVisible(false);
    };
    // 给出建议的文件名
    const generateSuggestedName = (customerName: string, fileType: string, signDate: any) => {
        if (!customerName && !fileType && !signDate) return '';
        const dateStr = signDate ? (typeof signDate === 'string' ? signDate : signDate.format ? signDate.format('YYYYMMDD') : '') : '';
        const parts = [] as string[];
        if (customerName) parts.push(customerName);
        if (fileType) parts.push(fileType);
        if (dateStr) parts.push(dateStr);
        return parts.join('-') + (parts.length ? '.pdf' : '');
    };

    const handleConfirmFile = (file: any) => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            const base = (file.name || file.originFileObj?.name || '').replace(/\.pdf$/i, '');
            const guessed = { customerName: '', pledgor: '', debtor: '', fileType: '保证金担保', signDate: null, expiryDate: null } as any;
            const parts = base.split(/[_\-\s]+/);
            if (parts.length >= 1) guessed.customerName = parts[0] || '';
            if (parts.length >= 2) guessed.fileType = parts[1] || guessed.fileType;
            guessed.signDate = null;
            guessed.fileId = `F-${Date.now()}`;
            showTagModalWith(file.name || base, guessed, file);
        }, 1200);
    };

    const handleRemoveParserFile = (fileUid: string) => {
        setParserFileList(prev => prev.filter((f: any) => f.uid !== fileUid));
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            // 这里可以把 tags 提交到后端保存，这里模拟保存：先显示保存 loading，然后提示成功并关闭模态框
            console.log('保存标签：', values);
            setSaving(true);
            setTimeout(() => {
                message.success('文件标签保存成功');
                setModalVisible(false);
                setSaving(false);
                if (editingFile) {
                    setParserFileList(prev => prev.filter((f: any) => (f.uid ? f.uid !== editingFile.uid : f.name !== editingFile.name)));
                    setEditingFile(null);
                }
            }, 2000);
        } catch (err) {
            // 校验不通过
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* 智能文件拆分：上段 */}
                <div style={{ padding: 20, border: '1px dashed #eee', borderRadius: 6, position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>智能文件拆分</h3>
                        {splitFiles && splitFiles.length > 0 && !splitting && (
                            <div style={{ fontSize: 12 }}>
                                <a onClick={() => { setSplitFiles([]); message.success('已清空拆分结果，可重新上传'); }}>重新上传</a>
                            </div>
                        )}
                    </div>
                    <div style={{ color: '#666', marginBottom: 12 }}>上传合并的 PDF 文件，系统将自动识别并拆分为独立文档。</div>
                    <Spin spinning={splitting} tip="正在智能分页...">
                        <Dragger {...splitProps} style={{ padding: 24 }}>
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">拖拽或点击上传一个合并的 PDF 文件来进行智能拆分</p>
                            <p className="ant-upload-hint">系统会自动识别并拆分为独立文档，上传后可预览拆分结果并下载。</p>
                        </Dragger>
                    </Spin>

                    {/* 分割结果预览 */}
                    {splitFiles.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ marginBottom: 8, fontWeight: 600 }}>拆分结果预览</div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {splitFiles.map(part => (
                                    <div key={part.id} style={{ padding: 12, border: '1px solid #eee', borderRadius: 6, width: 260 }}>
                                        <div style={{ fontWeight: 600 }}>{part.name}</div>
                                            <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>{(part.size/1024).toFixed(1)} KB · <span style={{ color: '#555' }}>Preview P{part.pages?.start}-{part.pages?.end}</span></div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {/* 暂时屏蔽 */}
                                            {/* <Button size="small" onClick={() => {
                                                const uid = `-part-${Date.now()}`;
                                                const newFile = {
                                                    uid,
                                                    name: part.name,
                                                    status: 'done',
                                                    originFileObj: part.file,
                                                };
                                                setParserFileList(prev => [...prev, newFile]);
                                                message.success('已将拆分文件加入解析队列');
                                            }}>导入解析</Button> */}
                                            <Button size="small" onClick={() => {
                                                const a = document.createElement('a');
                                                a.href = part.url;
                                                a.download = part.name;
                                                a.click();
                                                URL.revokeObjectURL(part.url);
                                            }}>下载</Button>
                                                <Button size="small" danger onClick={() => {
                                                    setSplitFiles(prev => prev.filter(p => p.id !== part.id));
                                                }}>移除</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: 8 }}>
                                {/* 暂时屏蔽 */}
                                {/* <Button size="small" onClick={() => {
                                    // 导入全部
                                    const toAdd: any[] = splitFiles.map(part => ({ uid: `-part-${Date.now()}-${part.id}`, name: part.name, status: 'done', originFileObj: part.file }));
                                    setParserFileList(prev => [...prev, ...toAdd]);
                                    message.success('已将拆分文件全部导入解析区');
                                }}>全部导入解析</Button> */}
                                <Button style={{ marginLeft: 8 }} size="small" onClick={() => {
                                    splitFiles.forEach(part => {
                                        const a = document.createElement('a');
                                        a.href = part.url;
                                        a.download = part.name;
                                        a.click();
                                    });
                                }}>全部下载</Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 下段：解析上载区域（现有代码：调整为 parserProps 文件列表支持从上段导入） */}
                <div style={{ padding: 6 }}>
                    <div style={{ padding: 12, marginBottom: 8 }}>
                        <h3 style={{ margin: 0 }}>智能文件解析 & 打标</h3>
                        <div style={{ color: '#666', marginTop: 6 }}>上传单份文件，AI将自动提取关键元数据（客户、日期、类型）。</div>
                    </div>
                    <Spin spinning={loading} tip="正在识别，请稍候...">
                        <Dragger {...parserProps} fileList={parserFileList} onChange={(info) => {
                            setParserFileList(info.fileList);
                            parserProps.onChange && parserProps.onChange(info as any);
                        }} style={{ padding: 24 }}>
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">点击或拖拽文件到此处上传（解析区）</p>
                            <p className="ant-upload-hint">支持多文件上传。上传或从上段导入拆分文件进行解析。</p>
                        </Dragger>
                    </Spin>
                    {parserFileList && parserFileList.length > 0 && (
                        <div style={{ marginTop: 12, padding: 12, borderTop: '1px dashed #eee' }}>
                            <div style={{ fontWeight: 600, marginBottom: 8 }}>解析队列</div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {parserFileList.map((f: any) => (
                                    <div key={f.uid || f.name} style={{ padding: 10, border: '1px solid #f0f0f0', borderRadius: 6, width: 300 }}>
                                        <div style={{ fontWeight: 600 }}>{f.name}</div>
                                        <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
                                            {f.size ? `${(f.size/1024).toFixed(1)} KB` : ''}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <Button size="small" onClick={() => handleConfirmFile(f)}>确认并识别标签</Button>
                                            <Button size="small" onClick={() => {
                                                // download
                                                const fileObj = f.originFileObj || f;
                                                if (fileObj && fileObj instanceof File) {
                                                    const url = URL.createObjectURL(fileObj);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = fileObj.name || f.name;
                                                    a.click();
                                                    URL.revokeObjectURL(url);
                                                } else {
                                                    message.warning('无法下载（没有可用文件对象）');
                                                }
                                            }}>下载</Button>
                                            <Button size="small" onClick={() => handleRemoveParserFile(f.uid)}>移除</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                title="智能标签识别"
                visible={modalVisible}
                onCancel={handleCancel}
                footer={null}
                destroyOnClose
                width={800}
            >
                <div style={{ marginBottom: 12, color: '#555' }}>请检查自动识别的标签是否准确，或手动填写。</div>
                <Spin spinning={saving} tip="保存中...">
                    <Form form={form} layout="vertical" onValuesChange={(_changed, all) => {
                        const suggestedName = generateSuggestedName(all.customerName, all.fileType, all.signDate);
                        form.setFieldsValue({ suggestedName });
                    }}>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label="原始文件名" name="originalFileName">
                                    <Input disabled />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="新文件名" name="suggestedName">
                                    <Input />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="文件ID" name="fileId">
                                    <Input />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label="客户名" name="customerName">
                                    <Input />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="出质人名" name="pledgor">
                                    <Input />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label="债务人名" name="debtor">
                                    <Input />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="文件类型" name="fileType">
                                    <Select>
                                        <Option value="其他">其他</Option>
                                        <Option value="保密协议">保密协议</Option>
                                        <Option value="服务合同">服务合同</Option>
                                        <Option value="保证金担保">保证金担保</Option>
                                        <Option value="应收帐款质押协议">应收帐款质押协议</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label="签署日期" name="signDate">
                                    <DatePicker style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="有效日期 (截止日期)" name="expiryDate">
                                    <DatePicker style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <Button onClick={handleCancel} disabled={saving}>取消</Button>
                                <Button type="primary" onClick={handleSave} loading={saving}>确认并保存标签</Button>
                            </div>
                        </Form.Item>
                    </Form>
                </Spin>
            </Modal>
        </div>
    );
}

export default UploadPage;