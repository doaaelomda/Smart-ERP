import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { LanguageService } from './language.service';
import { LazyTranslateLoader } from './translate-loader';

describe('LanguageService', () => {
  let service: LanguageService;
  let document: Document;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideTranslateService({ loader: provideTranslateLoader(LazyTranslateLoader) })],
    });
    service = TestBed.inject(LanguageService);
    document = TestBed.inject(DOCUMENT);
    await service.init();
  });

  it('defaults to Arabic RTL', () => {
    expect(service.language()).toBe('ar');
    expect(service.direction()).toBe('rtl');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('toggles to English LTR and persists the choice', async () => {
    await service.toggle();
    expect(service.language()).toBe('en');
    expect(service.isRtl()).toBe(false);
    expect(document.documentElement.dir).toBe('ltr');
    expect(localStorage.getItem('erp.language')).toBe('en');
  });
});
