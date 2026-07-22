// Az általad írt típus és ikon mapping marad pontosan így:
export type CategoryIconType = 
  | 'WORK' | 'MEETING' | 'PERSONAL' | 'FAMILY' 
  | 'IMPORTANT' | 'HOLIDAY' | 'HEALTH' | 'STUDY' 
  | 'SPORTS' | 'FINANCE' | 'CELEBRATION' | 'TRAVEL' | 'OTHER';

export const CATEGORY_ICONS: Record<CategoryIconType, string> = {
  'WORK': 'work',               
  'MEETING': 'groups',          
  'PERSONAL': 'person',         
  'FAMILY': 'family_restroom',  
  'IMPORTANT': 'warning',       
  'HOLIDAY': 'flight_takeoff',  
  'HEALTH': 'medical_services',     
  'STUDY': 'school',                
  'SPORTS': 'fitness_center',       
  'FINANCE': 'account_balance_wallet', 
  'CELEBRATION': 'cake',            
  'TRAVEL': 'directions_car',
  'OTHER': 'label'
};

export interface CategoryDefinition {
  id: CategoryIconType;
  name: string;
  icon: string;
  defaultColor: string;
}

export const FIXED_CATEGORIES: CategoryDefinition[] = [
  { id: 'WORK', name: 'Munka', icon: CATEGORY_ICONS['WORK'], defaultColor: '#3f51b5' },
  { id: 'MEETING', name: 'Találkozó', icon: CATEGORY_ICONS['MEETING'], defaultColor: '#009688' },
  { id: 'PERSONAL', name: 'Személyes', icon: CATEGORY_ICONS['PERSONAL'], defaultColor: '#9c27b0' },
  { id: 'FAMILY', name: 'Család', icon: CATEGORY_ICONS['FAMILY'], defaultColor: '#ff9800' },
  { id: 'IMPORTANT', name: 'Fontos', icon: CATEGORY_ICONS['IMPORTANT'], defaultColor: '#f44336' },
  { id: 'HOLIDAY', name: 'Szabadság', icon: CATEGORY_ICONS['HOLIDAY'], defaultColor: '#03a9f4' },
  { id: 'HEALTH', name: 'Egészség', icon: CATEGORY_ICONS['HEALTH'], defaultColor: '#4caf50' },
  { id: 'STUDY', name: 'Tanulás', icon: CATEGORY_ICONS['STUDY'], defaultColor: '#ff5722' },
  { id: 'SPORTS', name: 'Sport', icon: CATEGORY_ICONS['SPORTS'], defaultColor: '#8bc34a' },
  { id: 'FINANCE', name: 'Pénzügy', icon: CATEGORY_ICONS['FINANCE'], defaultColor: '#ffc107' },
  { id: 'CELEBRATION', name: 'Ünnep', icon: CATEGORY_ICONS['CELEBRATION'], defaultColor: '#e91e63' },
  { id: 'TRAVEL', name: 'Utazás', icon: CATEGORY_ICONS['TRAVEL'], defaultColor: '#795548' },
  { id: 'OTHER', name: 'Egyéb', icon: CATEGORY_ICONS['OTHER'], defaultColor: '#9e9e9e' }
];