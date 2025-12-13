import s from "./UploadDashboard.module.css";
import {DragEvent, useState} from "react";
import classNames from "classnames";

const UploadDashboard = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [status, setStatus] = useState("");

    const handleDragEnter = () => setIsDragging(true);
    const handleDragLeave = () => setIsDragging(false);
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault();

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        setStatus("Uploading...");

        for(const file of files) {
            try {
                const result = await window.api.uploadFile(file);
                setStatus(result.message);
            } catch(err) {
                setStatus("Error: " + err);
            }
        }
        setIsDragging(false);
    };

    return (
        <div className={"pageWrapper"}>
            <h1>Track Upload</h1>
            <div className={classNames(s.dragArea, isDragging ? s.dragging : "")}
                 onDrop={handleDrop}
                 onDragOver={handleDragOver}
                 onDragEnter={handleDragEnter}
                 onDragLeave={handleDragLeave}
            ><p>Drag files here!</p></div>
            <p>{status}</p>
        </div>
    );
};

export default UploadDashboard;
