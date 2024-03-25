export interface NetworkMetadata {
  errata_id: string;
  nickname: string;
  blooms: string | null;
  assignment_type: string | null;
  dok: string | null;
  time: string | null;
  feature_page: string | null;
  feature_id: string | null;
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
  feature_page?: string;
  feature_id?: string;
  books: BookMetadata[];
  attachments: string[];
}
