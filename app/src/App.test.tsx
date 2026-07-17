// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from './App';

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe('App shell (smoke)', () => {
  it('renders the home screen with the product name and disclaimer', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Successor' })).toBeTruthy();
    expect(screen.getByText(/does not provide\s+financial, tax, legal/i)).toBeTruthy();
    expect(screen.getByText('No projects yet. Start one below.')).toBeTruthy();
  });

  it('creates a project end to end and lands on the project screen', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start a new project' }));
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Hartwell Machine (FIXTURE)' } });
    fireEvent.change(screen.getByLabelText("The owner's name"), { target: { value: 'Ray (fictional)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));

    // The project screen shows the business name and the new knowledge entry point.
    expect(screen.getByRole('heading', { name: 'Hartwell Machine (FIXTURE)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Review & add knowledge/i })).toBeTruthy();
  });
});
