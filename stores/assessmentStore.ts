import { create } from 'zustand';

interface AssessmentState {
  assessmentId: string | null;
  candidateName: string;
  primarySkill: string;
  extractedSkills: string[];
  parsedData: any;
  tempId: string | null;
  fileUrl: string | null;

  // Set resume extraction results
  setResumeData: (data: {
    skills: string[];
    primary_skill: string;
    parsed_data: any;
    tempId: string;
    file_url: string;
  }) => void;
  
  // Setters
  setAssessmentId: (id: string | null) => void;
  setCandidateName: (name: string) => void;
  reset: () => void;
}

export const useAssessmentStore = create<AssessmentState>((set) => ({
  assessmentId: null,
  candidateName: '',
  primarySkill: '',
  extractedSkills: [],
  parsedData: null,
  tempId: null,
  fileUrl: null,

  setResumeData: (data) => set({
    extractedSkills: data.skills,
    primarySkill: data.primary_skill,
    parsedData: data.parsed_data,
    tempId: data.tempId,
    fileUrl: data.file_url,
    candidateName: data.parsed_data?.full_name || '',
  }),
  
  setAssessmentId: (id) => set({ assessmentId: id }),
  setCandidateName: (name) => set({ candidateName: name }),
  
  reset: () => set({
    assessmentId: null,
    candidateName: '',
    primarySkill: '',
    extractedSkills: [],
    parsedData: null,
    tempId: null,
    fileUrl: null,
  }),
}));
