import s from "./FilterBar.module.css";

export type FilterEntry<T extends string> = {
    type: T;
    label: string;
};

type Props<T extends string> = {
    options: FilterEntry<T>[];
    value: T;
    onChange: (value: T) => void;
};

const FilterBar = <T extends string>({ options, value, onChange }: Props<T>) => {
    return (
        <div className={s.filterWrapper}>
            {options.map(entry => (
                <div
                    key={entry.type}
                    onClick={() => onChange(entry.type)}
                    className={entry.type === value ? s.filterActive : ""}
                >
                    <p>{entry.label}</p>
                </div>
            ))}
        </div>
    );
};

export default FilterBar;
