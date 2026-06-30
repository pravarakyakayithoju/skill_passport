import { create } from 'zustand';

interface AssessmentState {
  assessmentId: string | null;
  candidateName: string;
  primarySkill: string;
  extractedSkills: string[];
  parsedData: any;
  tempId: string | null;
  fileUrl: string | null;

  proctoringStream: MediaStream | null;
  violationsCount: number;

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
  setProctoringStream: (stream: MediaStream | null) => void;
  setViolationsCount: (count: number) => void;
  incrementViolations: () => void;
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
  proctoringStream: null,
  violationsCount: 0,

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
  setProctoringStream: (stream) => set((state) => {
    if (state.proctoringStream && state.proctoringStream !== stream) {
      state.proctoringStream.getTracks().forEach((track) => track.stop());
    }
    return { proctoringStream: stream };
  }),
  setViolationsCount: (count) => set({ violationsCount: count }),
  incrementViolations: () => set((state) => ({ violationsCount: state.violationsCount + 1 })),
  
  reset: () => set((state) => {
    if (state.proctoringStream) {
      state.proctoringStream.getTracks().forEach((track) => track.stop());
    }
    return {
      assessmentId: null,
      candidateName: '',
      primarySkill: '',
      extractedSkills: [],
      parsedData: null,
      tempId: null,
      fileUrl: null,
      proctoringStream: null,
      violationsCount: 0,
    };
  }),
}));
