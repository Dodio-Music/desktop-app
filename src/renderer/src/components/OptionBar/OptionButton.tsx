import React, {FC} from "react";
import {Tooltip} from "@mui/material";
import s from "./OptionBar.module.css";

interface OptionButtonProps {
    tooltip: string;
    disabled?: boolean;
    disabledTooltip?: string;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    children: React.ReactNode;
    className?: string;
}

export const OptionButton: FC<OptionButtonProps> = ({
                                                              tooltip,
                                                              disabled = false,
                                                              disabledTooltip,
                                                              onClick,
                                                              children,
                                                              className,
                                                          }) => {
    const title = disabled && disabledTooltip ? disabledTooltip : tooltip;

    return (
        <Tooltip title={title}>
            <button
                className={`${className ?? ""} ${disabled ? s.optionDisabled : ""}`}
                onClick={(e) => {
                    if (disabled) return;
                    onClick(e);
                }}
            >
                {children}
            </button>
        </Tooltip>
    );
};
