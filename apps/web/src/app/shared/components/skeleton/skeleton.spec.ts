import { TestBed } from '@angular/core/testing';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders the requested number of lines with a custom height', async () => {
    const fixture = TestBed.createComponent(Skeleton);
    fixture.componentRef.setInput('count', 3);
    fixture.componentRef.setInput('height', '20px');
    await fixture.whenStable();
    const lines: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('span'));
    expect(lines.length).toBe(3);
    expect(lines[0]!.style.height).toBe('20px');
    expect(lines[2]!.style.width).toBe('60%');
  });

  it('renders an image block', async () => {
    const fixture = TestBed.createComponent(Skeleton);
    fixture.componentRef.setInput('type', 'img');
    fixture.componentRef.setInput('height', '120px');
    await fixture.whenStable();
    const block: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(block.style.height).toBe('120px');
    expect(block.classList).toContain('rounded-md');
  });
});
