文件夹内有以下文件，请阅读说明：

———————————— 以下是文件拆分功能 ————————————————
待拆分的PDF：
- 1. Demo Sample_To be Splited.pdf
- 2. Demo Sample_To be Splited.pdf

每个PDF的拆分结果：
- 1. Split Output.md
- 2. Split Output.md
拆分结果的 md 文件包括对应原文件的首尾页码、拆分后文件名

每个PDF拆分后生成的子PDF：放在与待拆分文件同名的文件夹内

———————————— 以下是文件识别功能 —————————————————
请参考 To Dashboard_all.json 文件，每上传一个文件，就按上传文件的文件名检索 json 中的 "fileName" 字段，精确匹配后可以读出需要在前端显示的各个特征
用户点击确认上传之后，给 Dashboard 看板页传输信号，信号为与文件名对应的 json 内容