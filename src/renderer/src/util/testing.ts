const isE2E = import.meta.env.VITE_E2E;
console.log({isE2E});

export function testId(id: `${string}-${string}`) {
    console.log({isE2E});
    return isE2E?{"data-testid": id}:{};
}
