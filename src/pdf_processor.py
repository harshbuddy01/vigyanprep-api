#!/usr/bin/env python3
"""
PDF Question Extractor with Mathematical Equation Support
Extracts questions from PDF files and converts them to structured JSON format
"""

import sys
import json
import re
import os

# Redirect all print() to stderr by default
def debug_print(msg):
    """Print debug messages to stderr"""
    print(msg, file=sys.stderr)

try:
    import PyPDF2
except ImportError:
    # If PyPDF2 is not installed, output error as JSON and exit
    error_output = {
        'success': False,
        'error': 'PyPDF2 library not installed',
        'error_type': 'ImportError',
        'hint': 'Install with: pip3 install PyPDF2'
    }
    print(json.dumps(error_output), flush=True)  # Ensure immediate output
    sys.exit(1)

from io import BytesIO
import base64

class PDFQuestionExtractor:
    def __init__(self):
        self.questions = []
        
    def extract_text_from_pdf(self, pdf_file_path):
        """Extract text content from PDF file"""
        try:
            if not os.path.exists(pdf_file_path):
                return f"Error: PDF file not found at {pdf_file_path}"
            
            with open(pdf_file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                if len(pdf_reader.pages) == 0:
                    return "Error: PDF file has no pages"
                
                text = ""
                for page_num, page in enumerate(pdf_reader.pages):
                    try:
                        page_text = page.extract_text()
                        text += page_text + "\n"
                    except Exception as page_error:
                        debug_print(f"Warning: Could not extract text from page {page_num + 1}: {str(page_error)}")
                        continue
                
                if not text.strip():
                    return "Error: No text could be extracted from PDF (might be image-based)"
                
                return text
        except Exception as e:
            return f"Error reading PDF: {str(e)}"
    
    def extract_text_from_base64(self, base64_string):
        """Extract text from base64 encoded PDF"""
        try:
            pdf_bytes = base64.b64decode(base64_string)
            pdf_file = BytesIO(pdf_bytes)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            return f"Error reading PDF: {str(e)}"
    
    def detect_math_equations(self, text):
        """Detect and format mathematical equations"""
        # Common math patterns
        patterns = {
            'fraction': r'(\d+)/(\d+)',
            'power': r'(\w+)\^(\d+)',
            'sqrt': r'√(\w+)',
            'integral': r'∫',
            'summation': r'∑',
            'greek': r'[α-ωΑ-Ω]',
            'operators': r'[≤≥≠±×÷∞]'
        }
        
        has_math = False
        for pattern_name, pattern in patterns.items():
            if re.search(pattern, text):
                has_math = True
                break
        
        return has_math
    
    def format_math_equation(self, text):
        """Convert math notation to LaTeX format"""
        # Convert common patterns to LaTeX
        text = re.sub(r'(\d+)/(\d+)', r'\\frac{\1}{\2}', text)
        text = re.sub(r'(\w+)\^(\d+)', r'\1^{\2}', text)
        text = re.sub(r'√(\w+)', r'\\sqrt{\1}', text)
        text = re.sub(r'α', r'\\alpha', text)
        text = re.sub(r'β', r'\\beta', text)
        text = re.sub(r'γ', r'\\gamma', text)
        text = re.sub(r'≤', r'\\leq', text)
        text = re.sub(r'≥', r'\\geq', text)
        text = re.sub(r'≠', r'\\neq', text)
        text = re.sub(r'∞', r'\\infty', text)
        
        return text
    
    def parse_questions(self, text):
        """Parse questions from extracted text"""
        questions = []
        
        # Pattern to match numbered questions (1., 2., Q1, Q.1, etc.)
        question_pattern = r'(?:^|\n)(?:Q\.?\s*)?(\d+)[\.\)]\s*(.+?)(?=(?:\n(?:Q\.?\s*)?\d+[\.\)])|$)'
        
        matches = re.finditer(question_pattern, text, re.MULTILINE | re.DOTALL)
        
        for match in matches:
            question_num = match.group(1)
            question_text = match.group(2).strip()
            
            # Try to extract options (A), B), (a), b), etc.
            options_pattern = r'(?:^|\n)\s*(?:\()?([A-Da-d])[\.\)]\s*(.+?)(?=(?:\n\s*(?:\()?[A-Da-d][\.\)])|$)'
            options = []
            option_matches = re.finditer(options_pattern, question_text, re.MULTILINE | re.DOTALL)
            
            for opt in option_matches:
                option_letter = opt.group(1).upper()
                option_text = opt.group(2).strip()
                options.append({
                    'label': option_letter,
                    'text': self.format_math_equation(option_text) if self.detect_math_equations(option_text) else option_text
                })
            
            # Remove options from question text
            if options:
                for opt_match in re.finditer(options_pattern, question_text, re.MULTILINE | re.DOTALL):
                    question_text = question_text.replace(opt_match.group(0), '')
            
            question_text = question_text.strip()
            
            # Detect if question contains math
            has_math = self.detect_math_equations(question_text)
            if has_math:
                question_text = self.format_math_equation(question_text)
            
            question_obj = {
                'question_number': int(question_num),
                'question_text': question_text,
                'has_math': has_math,
                'options': options if len(options) >= 2 else [],
                'answer': None,  # To be filled manually or extracted separately
                'difficulty': 'medium',  # Default
                'marks': 1  # Default
            }
            
            questions.append(question_obj)
        
        return questions
    
    def extract_answer_key(self, text):
        """Try to extract answer key if present"""
        answer_pattern = r'(?:Answer|Ans|Key)[\s:]*(\d+)[\.\)]\s*([A-Da-d])'
        answers = {}
        
        matches = re.finditer(answer_pattern, text, re.IGNORECASE)
        for match in matches:
            q_num = int(match.group(1))
            answer = match.group(2).upper()
            answers[q_num] = answer
        
        return answers
    
    def process_pdf(self, pdf_input, input_type='file', metadata=None):
        """
        Main processing function
        input_type: 'file' or 'base64'
        metadata: dict with examType, subject, topic, year
        """
        # Extract text
        if input_type == 'file':
            text = self.extract_text_from_pdf(pdf_input)
        else:
            text = self.extract_text_from_base64(pdf_input)
        
        if text.startswith("Error"):
            return {'success': False, 'error': text}
        
        # Parse questions
        questions = self.parse_questions(text)
        
        if len(questions) == 0:
            return {
                'success': False,
                'error': 'No questions found in PDF',
                'hint': 'Make sure questions are numbered (1., 2., Q1, etc.) with options A, B, C, D'
            }
        
        # Try to extract answers
        answers = self.extract_answer_key(text)
        
        # Apply answers to questions
        for q in questions:
            q_num = q['question_number']
            if q_num in answers:
                q['answer'] = answers[q_num]
        
        # Add metadata if provided
        if metadata:
            for q in questions:
                q.update({
                    'examType': metadata.get('examType', ''),
                    'subject': metadata.get('subject', ''),
                    'topic': metadata.get('topic', ''),
                    'year': metadata.get('year', '')
                })
        
        return {
            'success': True,
            'total_questions': len(questions),
            'questions': questions,
            'raw_text_length': len(text)
        }

def main():
    """Command line interface"""
    try:
        if len(sys.argv) < 2:
            output = {
                'success': False,
                'error': 'No PDF file path provided',
                'usage': 'python3 pdf_processor.py <pdf_file_path> [examType] [subject] [topic] [year]'
            }
            print(json.dumps(output), flush=True)
            sys.exit(1)
        
        pdf_path = sys.argv[1]
        
        # Check if file exists
        if not os.path.exists(pdf_path):
            output = {
                'success': False,
                'error': f'PDF file not found: {pdf_path}',
                'error_type': 'FileNotFoundError'
            }
            print(json.dumps(output), flush=True)
            sys.exit(1)
        
        # Get metadata from command line args if provided
        metadata = {}
        if len(sys.argv) > 2:
            metadata['examType'] = sys.argv[2] if len(sys.argv) > 2 else ''
            metadata['subject'] = sys.argv[3] if len(sys.argv) > 3 else ''
            metadata['topic'] = sys.argv[4] if len(sys.argv) > 4 else ''
            metadata['year'] = sys.argv[5] if len(sys.argv) > 5 else ''
        
        extractor = PDFQuestionExtractor()
        result = extractor.process_pdf(pdf_path, input_type='file', metadata=metadata)
        
        # CRITICAL: Only print JSON to stdout, nothing else!
        print(json.dumps(result), flush=True)
        
        # Exit with appropriate code
        if result.get('success', False):
            sys.exit(0)
        else:
            sys.exit(1)
        
    except Exception as e:
        # Catch ALL errors and return as JSON
        error_result = {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }
        print(json.dumps(error_result), flush=True)
        sys.exit(1)

if __name__ == '__main__':
    main()
