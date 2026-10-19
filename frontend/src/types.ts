export type Page ='home' | 'facilities' | 'contact' | 'login';

export interface ContactformData {
    name: string;
    whatsapp: string;
    message: string;
}

export interface LoginFormData {
    username: string;
    password: string;
}