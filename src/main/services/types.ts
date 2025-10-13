type DateType = string;

export interface BaseModel {
  is_active?: boolean;
  deleted_at?: DateType;
  created_at?: DateType;
  updated_at?: DateType;
}