import { renderTemplate } from './templateEngine';

describe('renderTemplate', () => {
  it('substitutes known tokens', () => {
    const out = renderTemplate('Hello {{name}}, PA {{paId}} approved.', {
      name: 'Jordan',
      paId: 'PA-001',
    });
    expect(out).toBe('Hello Jordan, PA PA-001 approved.');
  });

  it('leaves unknown tokens visible', () => {
    const out = renderTemplate('Status: {{missing}}', { other: 'x' });
    expect(out).toBe('Status: {{missing}}');
  });
});