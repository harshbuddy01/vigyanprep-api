#!/usr/bin/env python3
import sys
import json
import os

try:
    import google.generativeai as genai
except ImportError:
    print(json.dumps({"error": "google-generativeai not installed"}), file=sys.stderr)
    sys.exit(1)

def convert_text_to_questions(text, api_key=None):
    """Convert PDF text to quiz questions using Google Gemini AI"""
    try:
        # Get API key from environment or parameter
        if not api_key:
            api_key = os.getenv('GEMINI_API_KEY') or os.getenv('Gemini_API_Key') or os.getenv('GOOGLE_AI_KEY')
        
        if not api_key:
            return {"error": "No AI API key provided"}
        
        # Configure Gemini
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-pro')
        
        # Create prompt
        prompt = f"""
You are an expert quiz generator for NISER/IISER entrance exam preparation.
Convert the following text into multiple-choice questions suitable for science students.

Format each question as JSON:
{{
  "question": "The question text",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
  "correctAnswer": "A",
  "explanation": "Brief explanation of why this is correct",
  "difficulty": "easy/medium/hard",
  "topic": "relevant topic name"
}}

Requirements:
- Create 10-15 high-quality questions
- Cover all major concepts in the text
- Include mix of difficulty levels
- Make distractors plausible but incorrect
- Keep explanations concise

TEXT:
{text[:4000]}

Return ONLY valid JSON array, no other text.
"""
        
        # Generate questions
        response = model.generate_content(prompt)
        
        # Parse response
        questions_text = response.text.strip()
        
        # Try to extract JSON if wrapped in markdown
        if questions_text.startswith('```json'):
            questions_text = questions_text.replace('```json', '').replace('```', '').strip()
        elif questions_text.startswith('```'):
            questions_text = questions_text.replace('```', '').strip()
        
        questions = json.loads(questions_text)
        
        return {
            "success": True,
            "questions": questions,
            "count": len(questions)
        }
    
    except json.JSONDecodeError as e:
        return {
            "error": f"Failed to parse AI response: {str(e)}",
            "raw_response": response.text if 'response' in locals() else None
        }
    except Exception as e:
        return {"error": f"AI conversion failed: {str(e)}"}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No text provided"}), file=sys.stderr)
        sys.exit(1)
    
    # ✅ FIXED: Correct argument indexing
    text = sys.argv[1]
    api_key = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Convert to questions
    result = convert_text_to_questions(text, api_key)
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()