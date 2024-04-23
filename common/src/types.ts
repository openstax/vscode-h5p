export interface NetworkMetadata {
  errata_id: string;
  nickname: string;
  blooms: string | null;
  assignment_type: string | null;
  dok: string | null;
  time: string | null;
  context: string[];
  books: BookMetadata[];
}

export interface BookMetadata {
  name: string;
  lo?: string[];
  aplo?: string[];
  hts?: string;
  rp?: string;
  science_practice?: string;
  aacn?: string;
  nclex?: string;
}

export interface CanonicalMetadata {
  errata_id: string;
  blooms?: string;
  assignment_type?: string;
  dok?: string;
  time?: string;
  context: string[];
  books: BookMetadata[];
  attachments: string[];
}
