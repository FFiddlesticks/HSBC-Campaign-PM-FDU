import model
import argparse

def test_ocr_parse():
    model.ocr_parse("test.pdf")

def test_content_structure():
    ret = model.content_structure("test.txt")
    print(ret)

def test_parse_pdf(pdf_path: str):
    ret = model.parse_pdf(pdf_path)
    print(ret)
    
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Test PDF parsing")
    parser.add_argument("pdf_path", type=str, help="Path to the PDF file to test")
    args = parser.parse_args()
    test_parse_pdf(args.pdf_path)
