import s from "./UploadDashboard.module.css";
import {DragEvent, useEffect, useState} from "react";
import classNames from "classnames";
import {MdDelete} from "react-icons/md";
import {UploadState} from "../../../../shared/adminApi";
import {LinearProgress} from "@mui/material";

const UploadDashboard = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploads, setUploads] = useState<Record<string, UploadState>>({});

    const handleDragEnter = () => setIsDragging(true);
    const handleDragLeave = () => setIsDragging(false);
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault();

    const handleDelete = async (fileName: string) => {
        const deleted = await window.api.deleteUploadedFile(fileName);

        if(deleted) {
            setUploads((prev) => {
                const newUploads = { ...prev };
                delete newUploads[fileName];
                return newUploads;
            });
        }
    };

    useEffect(() => {
        const fetchUploads = async () => {
            const songMap = await window.api.getUploads();
            setUploads(songMap);
        }

        void fetchUploads();

        const unsub = window.api.onFileUploadProgress((state) => {
            setUploads((prev) => ({
                ...prev,
                [state.fileName]: state
            }));
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
            void window.api.uploadFile(file);
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
                            {info.status === "uploading" ?
                                <div className={s.progress}>
                                    <LinearProgress sx={{flex: 1}} color={"inherit"} value={info.percent} variant={"determinate"}/>
                                    <p className={s.percent}>{info.percent}%</p>
                                </div>
                                :
                                <p className={info.status === "success" ? s.statusSuccess : info.status === "error" ? s.statusError : s.status}>{info.message}</p>
                            }
                            <p className={s.delete} onClick={() => handleDelete(file)}><MdDelete size={25} /></p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UploadDashboard;
