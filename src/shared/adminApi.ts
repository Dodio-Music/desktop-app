export interface UploadState {
    fileName: string;
    percent: number;
    status: "uploading" | "success" | "error";
    message?: string;
}
