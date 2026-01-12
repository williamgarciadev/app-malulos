const DEFAULT_PRESETS = [
    'Sin cebolla',
    'Sin tomate',
    'Salsa aparte',
    'Poco picante',
    'Bien asado',
    'Sin sal',
    'Pan aparte'
]

const CATEGORY_PRESETS: Array<{ match: RegExp; presets: string[] }> = [
    {
        match: /bebida/i,
        presets: [
            'Sin hielo',
            'Poco hielo',
            'Con hielo',
            'Sin azucar',
            'Con limon',
            'Vaso aparte'
        ]
    }
]

export const getNotePresetsForCategory = (categoryName?: string) => {
    if (!categoryName) return DEFAULT_PRESETS
    const match = CATEGORY_PRESETS.find(entry => entry.match.test(categoryName))
    return match ? match.presets : DEFAULT_PRESETS
}
