// tooltipUtils.ts

// Fonction pour remplacer les placeholders {{...}} par les valeurs réelles
export function formatTooltip(text: string, data: Record<string, any>): string {
    if (!text) return "";

    let formattedText = text;

    // Ex: Remplace {{price_usd}} par data.price_usd
    for (const key in data) {
        // Crée l'expression régulière pour le placeholder, ex: /\{\{price_usd\}\}/g
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');

        // Formatte la valeur avant de la remplacer (si nécessaire)
        let value = data[key];
        if (typeof value === 'number') {
            // Exemple simple: Limiter les décimales si le nombre est grand
            value = value.toFixed(value > 1000 ? 0 : 2);
        }

        // Effectue le remplacement
        formattedText = formattedText.replace(regex, String(value ?? '-'));
    }

    return formattedText;
}