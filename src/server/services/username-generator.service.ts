const ADJ = [
    "Sumliv",
    "Brza",
    "Vesel",
    "Mamuren",
    "Gladen",
    "Lut",
    "Istar",
    "Zaspan",
];

const NOUN = [
    "Machor",
    "Mechka",
    "Kompir",
    "Ajvar",
    "Burek",
    "Sharan",
    "Volk",
    "Kengur",
];

export class UsernameGeneratorService {
    constructor(
        private readonly adjectives = ADJ,
        private readonly nouns = NOUN,
    ) {}

    generate(): string {
        const a =
            this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
        const n = this.nouns[Math.floor(Math.random() * this.nouns.length)];
        const num = Math.floor(10 + Math.random() * 90);
        return `${a}-${n}-${num}`;
    }
}
