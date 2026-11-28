import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../App';

describe('<App /> integration in non-WebGL test environment', () => {
  it('opens Consultant Profile and Consultation modals orthogonally without leaving Hero stage', () => {
    render(<App />);

    const shell = document.getElementById('app-shell');
    expect(shell).not.toBeNull();
    expect(shell).toHaveAttribute('data-stage', 'hero');

    const aboutBtn = document.getElementById('hero-about-btn');
    expect(aboutBtn).not.toBeNull();
    if (aboutBtn) fireEvent.click(aboutBtn);

    const profileDialog = screen.getByRole('dialog');
    expect(profileDialog.id).toBe('consultant-profile-modal');
    expect(shell).toHaveAttribute('data-stage', 'hero');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.getElementById('consultant-profile-modal')).toBeNull();

    const consultBtn = document.getElementById('hero-consult-btn');
    if (consultBtn) fireEvent.click(consultBtn);
    expect(document.getElementById('consult-modal')).not.toBeNull();

    const nameInput = document.getElementById('consult-name') as HTMLInputElement;
    const phoneInput = document.getElementById('consult-phone') as HTMLInputElement;
    const submitBtn = document.getElementById('consult-submit-btn') as HTMLButtonElement;

    fireEvent.change(nameInput, { target: { value: 'Kareem Adel' } });
    fireEvent.change(phoneInput, { target: { value: '01280249440' } });
    fireEvent.click(submitBtn);

    const refEl = document.getElementById('consult-reference-id');
    expect(refEl?.textContent).toMatch(/^REQ-20\d{2}-[A-Z0-9]{4}$/);

    const waLink = document.getElementById('consult-whatsapp-link') as HTMLAnchorElement;
    expect(waLink.href).toContain('wa.me/201280249440');
    expect(decodeURIComponent(waLink.href)).toContain('Kareem Adel');
  });
});
