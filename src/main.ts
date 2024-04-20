import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { ErrorHandler } from '@angular/core';

const ROOT_ELEMENT_TAG = 'app-root-extension';
let __runningAsExtension__ = false;

class ErrorBoundary extends ErrorHandler {
  override handleError(error: any) {
    if (!error.message.includes('NG05104')) {
      super.handleError(error);
    }
  }
}


bootstrapApplication(AppComponent, {
  providers: [
    { provide: ErrorHandler, useClass: ErrorBoundary }
  ]
})
  .catch(() => {
    let rootElement: HTMLElement = <HTMLElement>document.querySelector(ROOT_ELEMENT_TAG);
    if (!rootElement) {
      __runningAsExtension__ = true;
      rootElement = document.createElement(ROOT_ELEMENT_TAG);
      document.body.appendChild(rootElement);
    }
    bootstrapApplication(AppComponent, { providers: [] })
      .catch((err) => console.error(err))
  })
  .finally(() => {
    window.__runningAsExtension__ = __runningAsExtension__;
    console.log('Running as extension:', __runningAsExtension__)
  })




