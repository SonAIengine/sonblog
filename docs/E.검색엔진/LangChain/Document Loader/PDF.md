## pdfminer.high_level 

```python
from pdfminer.high_level import extract_text
from pdfminer.layout import LAParams
import os
import sys

def extract_korean_text_from_pdf(pdf_path, output_path=None):
    """
    한글 PDF 파일에서 텍스트를 추출하는 함수
    
    Args:
        pdf_path (str): PDF 파일 경로
        output_path (str, optional): 추출된 텍스트를 저장할 파일 경로
    
    Returns:
        str: 추출된 텍스트
    """
    try:
        # LAParams 설정 (한글 처리를 위한 최적화)
        laparams = LAParams(
            boxes_flow=0.5,        # 텍스트 박스 흐름 조정
            word_margin=0.1,       # 단어 간 여백
            char_margin=2.0,       # 문자 간 여백
            line_margin=0.5,       # 줄 간 여백
            detect_vertical=True   # 세로 텍스트 감지
        )
        
        # PDF에서 텍스트 추출
        text = extract_text(pdf_path, laparams=laparams)
        
        # 추출된 텍스트 정리
        cleaned_text = text.strip()
        
        # 파일로 저장 (선택사항)
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(cleaned_text)
            print(f"텍스트가 {output_path}에 저장되었습니다.")
        
        return cleaned_text
        
    except Exception as e:
        print(f"오류 발생: {e}")
        return None

def extract_text_by_pages(pdf_path):
    """
    페이지별로 텍스트를 추출하는 함수
    
    Args:
        pdf_path (str): PDF 파일 경로
    
    Returns:
        list: 페이지별 텍스트 리스트
    """
    from pdfminer.high_level import extract_pages
    from pdfminer.layout import LTTextContainer
    
    pages_text = []
    
    try:
        for page_layout in extract_pages(pdf_path):
            page_text = ""
            for element in page_layout:
                if isinstance(element, LTTextContainer):
                    page_text += element.get_text()
            pages_text.append(page_text.strip())
        
        return pages_text
        
    except Exception as e:
        print(f"오류 발생: {e}")
        return []

def main():
    # 사용 예시
    pdf_file = "sample_korean.pdf"  # 한글 PDF 파일 경로
    
    # 파일 존재 확인
    if not os.path.exists(pdf_file):
        print(f"파일을 찾을 수 없습니다: {pdf_file}")
        return
    
    print("PDF 텍스트 추출 시작...")
    
    # 전체 텍스트 추출
    extracted_text = extract_korean_text_from_pdf(pdf_file, "extracted_korean_text.txt")
    
    if extracted_text:
        print("\n=== 추출된 텍스트 미리보기 ===")
        print(extracted_text[:500])  # 처음 500자만 출력
        print(f"\n전체 텍스트 길이: {len(extracted_text)} 문자")
    
    # 페이지별 텍스트 추출
    pages = extract_text_by_pages(pdf_file)
    print(f"\n총 {len(pages)}페이지가 처리되었습니다.")
    
    # 각 페이지의 텍스트 미리보기
    for i, page_text in enumerate(pages):
        if page_text.strip():  # 빈 페이지가 아닌 경우만
            print(f"\n--- 페이지 {i+1} ---")
            print(page_text[:200])  # 처음 200자만 출력

def batch_extract_pdfs(pdf_folder, output_folder):
    """
    폴더 내의 모든 PDF 파일에서 텍스트 추출
    
    Args:
        pdf_folder (str): PDF 파일들이 있는 폴더 경로
        output_folder (str): 추출된 텍스트를 저장할 폴더 경로
    """
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    pdf_files = [f for f in os.listdir(pdf_folder) if f.endswith('.pdf')]
    
    for pdf_file in pdf_files:
        pdf_path = os.path.join(pdf_folder, pdf_file)
        output_path = os.path.join(output_folder, f"{os.path.splitext(pdf_file)[0]}.txt")
        
        print(f"처리 중: {pdf_file}")
        extract_korean_text_from_pdf(pdf_path, output_path)

if __name__ == "__main__":
    main()
```