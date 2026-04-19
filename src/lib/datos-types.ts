export interface DatosEntity {
  id: string;
  label: string;
}

export interface DatosListResponse {
  results: Record<string, unknown>[];
  total_count: number;
  limit: number;
  date_column: string;
}

export interface DatosEntitiesResponse {
  results: DatosEntity[];
  date_columns: Record<string, string>;
}
