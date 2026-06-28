// inquirer v9 is ESM-only; types aren't found by bundler resolution
declare module "inquirer" {
  interface Question {
    type?: string;
    name: string;
    message?: string;
    choices?: Array<{ name: string; value: string }>;
    validate?: (v: string) => boolean | string;
    default?: string;
  }

  const inquirer: {
    prompt(questions: Question[]): Promise<Record<string, string>>;
  };
  export default inquirer;
}
