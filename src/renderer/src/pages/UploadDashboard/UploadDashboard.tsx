import s from "./UploadDashboard.module.css";
import {DragEvent, useEffect, useState} from "react";
import classNames from "classnames";
import {MdDelete} from "react-icons/md";

interface UploadInfo {
    status: string;
    success: boolean | null;
}

const UploadDashboard = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploads, setUploads] = useState<Record<string, UploadInfo>>({});

    const handleDragEnter = () => setIsDragging(true);
    const handleDragLeave = () => setIsDragging(false);
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault();

    const addUpload = (fileName: string, status: string, success: boolean | null) => {
        setUploads((prev) => ({
            ...prev,
            [fileName]: {status, success}
        }));
    };

    const handleDelete = (fileName: string) => {
        setUploads((prev) => {
            const newUploads = { ...prev };
            delete newUploads[fileName];
            return newUploads;
        });
    };

    useEffect(() => {
        const unsub = window.api.onProgress(({fileName, percent}) => {
            addUpload(fileName, percent + "%", null);
        });

        return () => {
            unsub();
        };
    }, []);

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        setIsDragging(false);

        for (const file of files) {
            const result = await window.api.uploadFile(file);
            addUpload(result.fileName, result.message, result.success);
        }
    };

    return (
        <div className={"pageWrapper"}>
            <h1 className={s.h1}>Track Upload</h1>
            <div className={s.horizontal}>
                <div className={classNames(s.dragArea, isDragging ? s.dragging : "")}
                     onDrop={handleDrop}
                     onDragOver={handleDragOver}
                     onDragEnter={handleDragEnter}
                     onDragLeave={handleDragLeave}
                ><p>Drag files here!</p></div>
                <div className={s.tableContainer}>
                    <div className={classNames(s.tableHead)}><p>File</p><p>Status</p></div>
                    {Object.entries(uploads).map(([file, info]) => (
                        <div className={classNames(s.tableRow)} key={file}>
                            <p className={s.fileName}>{file}</p>
                            <p className={info.success ? s.statusSuccess : info.success === false ? s.statusError : s.status}>{info.status}</p>
                            <p className={s.delete} onClick={() => handleDelete(file)}><MdDelete size={25} /></p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UploadDashboard;
