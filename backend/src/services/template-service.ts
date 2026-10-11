export class TemplateService {
  public static extractVariables(templateBody: string): string[] {
    const matches = templateBody.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
    if (!matches) return [];
    const vars = matches.map((m) => m.replace(/[\{\}]/g, '').trim());
    return Array.from(new Set(vars));
  }

  public static render(templateBody: string, variables: Record<string, string | number>): string {
    let rendered = templateBody;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, String(value ?? ''));
    }
    return rendered;
  }

  public static validateRequiredVariables(templateBody: string, variables: Record<string, string | number>): { isValid: boolean; missing: string[] } {
    const required = this.extractVariables(templateBody);
    const missing = required.filter((r) => variables[r] === undefined || variables[r] === null || String(variables[r]).trim() === '');
    return {
      isValid: missing.length === 0,
      missing,
    };
  }
}
