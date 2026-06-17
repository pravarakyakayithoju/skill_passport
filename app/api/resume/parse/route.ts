import { NextRequest } from 'next/server';
import { MOCK, MOCK_AI, MOCK_RESUME } from '@/lib/mock';
import { askGPTJson } from '@/lib/openai';
import { supabaseAdmin, ensureBucketExists } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const candidateName = formData.get('candidate_name') as string || '';

    if (!file) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (MOCK_AI) {
      // In Mock Mode, we still read the PDF text locally to simulate smart parsing!
      const buffer = Buffer.from(await file.arrayBuffer());
      let rawText = '';
      try {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        const parsedPdf = await parser.getText();
        rawText = parsedPdf.text || '';
      } catch (pdfError) {
        console.error('Offline mock text extraction failed:', pdfError);
      }

      // Try to extract name from the first few lines of the text
      let detectedName = candidateName;
      if (!detectedName && rawText) {
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          // Assume the first line containing letters is the name
          const potentialName = lines.find(l => /[a-zA-Z]/.test(l));
          if (potentialName) {
            detectedName = potentialName.substring(0, 40);
          }
        }
      }
      if (!detectedName) detectedName = MOCK_RESUME.full_name;

      // Scan text for tech keywords
      const knownSkills = [
        'javascript', 'typescript', 'react', 'nodejs', 'node.js', 'python', 'django', 'flask', 
        'java', 'spring', 'c++', 'cpp', 'c#', 'dotnet', 'go', 'golang', 'ruby', 'rails', 
        'php', 'laravel', 'sql', 'mysql', 'postgresql', 'mongodb', 'docker', 'kubernetes', 'aws',
        'html', 'css', 'vue', 'angular', 'next.js', 'tailwind'
      ];
      
      const detectedSkills = [];
      const textLower = rawText.toLowerCase();
      
      for (const skill of knownSkills) {
        if (textLower.includes(skill)) {
          detectedSkills.push(skill === 'node.js' ? 'nodejs' : skill);
        }
      }

      let skillsToUse = Array.from(new Set(detectedSkills));
      if (skillsToUse.length === 0) {
        skillsToUse = MOCK_RESUME.skills;
      }

      // Pick a primary skill
      let primaryToUse = skillsToUse[0] || 'javascript';
      const commonPrimaries = ['javascript', 'typescript', 'python', 'java', 'go', 'c++', 'c#', 'ruby', 'php', 'react'];
      const foundPrimary = commonPrimaries.find(p => skillsToUse.includes(p));
      if (foundPrimary) primaryToUse = foundPrimary;

      const parsedData = {
        full_name: detectedName,
        skills: skillsToUse,
        primary_skill: primaryToUse,
        experience_level: 'mid',
        summary: `Self-extracted offline candidate profile for ${detectedName}, specializing in ${primaryToUse}.`
      };

      return Response.json({
        skills: skillsToUse,
        primary_skill: primaryToUse,
        parsed_data: parsedData,
        tempId: 'mock-temp-' + Math.random().toString(36).substring(7),
        file_url: 'resumes/mock-temp/resume.pdf',
        raw_text: rawText
      });
    }

    // Real Flow:
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Parse PDF text content
    let rawText = '';
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const parsedPdf = await parser.getText();
      rawText = parsedPdf.text || '';
    } catch (pdfError) {
      console.error('Error parsing PDF text, falling back to empty string:', pdfError);
    }

    // Call GPT-4o to extract structured information
    const prompt = `Extract structured data from this resume. Return JSON:
{
  "full_name": "string",
  "skills": ["string"],
  "experience_level": "junior" | "mid" | "senior",
  "primary_skill": "string",
  "summary": "string"
}
If name is not found, default to "${candidateName || 'Unknown Candidate'}". Ensure primary_skill is chosen from the extracted skills.
Resume text:
${rawText}`;

    const parsedData = await askGPTJson<{
      full_name: string;
      skills: string[];
      experience_level: 'junior' | 'mid' | 'senior';
      primary_skill: string;
      summary: string;
    }>(prompt, {
      full_name: candidateName || 'Unknown Candidate',
      skills: [],
      experience_level: 'mid',
      primary_skill: 'javascript',
      summary: ''
    });

    // Clean primary skill and make sure it is in lowercase for matching
    const primarySkill = (parsedData.primary_skill || parsedData.skills[0] || 'javascript').toLowerCase();
    const skills = parsedData.skills.map(s => s.toLowerCase());

    // Upload to Supabase Storage
    const tempId = crypto.randomUUID();
    const filePath = `${tempId}/${file.name}`;
    
    if (MOCK) {
      return Response.json({
        skills,
        primary_skill: primarySkill,
        parsed_data: parsedData,
        tempId,
        file_url: `resumes/mock/${filePath}`,
        raw_text: rawText
      });
    }

    await ensureBucketExists('resumes');

    const { error: uploadError } = await supabaseAdmin.storage
      .from('resumes')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return Response.json({ error: `Failed to store resume: ${uploadError.message}` }, { status: 500 });
    }

    return Response.json({
      skills,
      primary_skill: primarySkill,
      parsed_data: parsedData,
      tempId,
      file_url: filePath,
      raw_text: rawText
    });
  } catch (error: any) {
    console.error('Resume parse error:', error);
    return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
