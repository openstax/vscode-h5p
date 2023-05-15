export interface Message<T = unknown> {
	type: string;
	data: T;
  }
  
  export interface FileInfo {
	server_url: string;
	uri: string;
	name: string;
	size: number;
  }