type DateType = string;

export interface BaseModel {
  id?: number;
  is_active?: boolean;
  deleted_at?: DateType;
  created_at?: DateType;
  updated_at?: DateType;
}