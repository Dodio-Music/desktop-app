export type Theme = {
    name: string;
    type: "light" | "dark";
    displayName: string;
}

export const themeOptions: Theme[] = [
    {name: "purple", displayName: "Basic Purple", type: "dark"},
    {name: "crimson", displayName: "Basic Crimson", type: "dark"},
    {name: "blue", displayName: "Basic Blue", type: "dark"},
    {name: "light", displayName: "Light", type: "light"},
    {name: "green", displayName: "Poisonous Snake", type: "dark"},
    {name: "rising-sun", displayName: "Rising Sun", type: "dark"}
] as const;
