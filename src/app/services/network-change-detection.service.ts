import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type NetworkChangeReason =
  | 'connection-properties'
  | 'reconnected';

export interface NetworkChangeEvent {
  reason: NetworkChangeReason;
  online: boolean;
  networkType: string;
  effectiveType: string;
}

interface BrowserNetworkInformation extends EventTarget {
  type?: string;
  effectiveType?: string;
  saveData?: boolean;
}

interface NavigatorWithNetworkInformation extends Navigator {
  connection?: BrowserNetworkInformation;
  mozConnection?: BrowserNetworkInformation;
  webkitConnection?: BrowserNetworkInformation;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkChangeDetectionService {
  private readonly networkChangedSubject =
    new Subject<NetworkChangeEvent>();

  readonly networkChanged$: Observable<NetworkChangeEvent> =
    this.networkChangedSubject.asObservable();

  private connection: BrowserNetworkInformation | null = null;

  private isListening = false;
  private wasOffline = false;

  private startedAt = 0;
  private lastEmissionAt = 0;
  private lastFingerprint = '';

  private readonly startupDelayMs = 2500;
  private readonly notificationCooldownMs = 4000;
  private readonly changeConfirmationDelayMs = 20000;

  private readonly connectionChangeHandler = (): void => {
    this.handleConnectionChange();
  };

  private readonly onlineHandler = (): void => {
    this.handleOnline();
  };

  private readonly offlineHandler = (): void => {
    this.handleOffline();
  };

  start(): void {
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      this.isListening
    ) {
      return;
    }

    this.isListening = true;
    this.startedAt = Date.now();
    this.wasOffline = !navigator.onLine;

    this.connection = this.getConnection();
    this.lastFingerprint = this.buildFingerprint();

    window.addEventListener(
      'online',
      this.onlineHandler
    );

    window.addEventListener(
      'offline',
      this.offlineHandler
    );

    this.connection?.addEventListener(
      'change',
      this.connectionChangeHandler
    );
  }

  stop(): void {
    if (
      typeof window === 'undefined' ||
      !this.isListening
    ) {
      return;
    }

    window.removeEventListener(
      'online',
      this.onlineHandler
    );

    window.removeEventListener(
      'offline',
      this.offlineHandler
    );

    this.connection?.removeEventListener(
      'change',
      this.connectionChangeHandler
    );

    this.connection = null;
    this.isListening = false;
    this.wasOffline = false;
  }

  getCurrentNetworkType(): string {
    if (typeof navigator === 'undefined') {
      return 'unknown';
    }

    const currentConnection = this.getConnection();

    return (
      currentConnection?.type ||
      currentConnection?.effectiveType ||
      'unknown'
    );
  }

  private handleConnectionChange(): void {
    const candidateFingerprint =
      this.buildFingerprint();

    if (
      candidateFingerprint ===
      this.lastFingerprint
    ) {
      return;
    }

    const previousStableFingerprint =
      this.lastFingerprint;

    /*
     * No se marca el cambio de inmediato.
     *
     * Muchas fluctuaciones de señal (4g -> 3g -> 4g)
     * generan el mismo evento sin que el usuario haya
     * cambiado realmente de red. Se espera un momento
     * y se vuelve a comprobar: si el fingerprint volvió
     * al valor anterior, se descarta como falso positivo.
     */
    setTimeout(() => {
      const confirmedFingerprint =
        this.buildFingerprint();

      if (
        confirmedFingerprint ===
        previousStableFingerprint
      ) {
        return;
      }

      this.lastFingerprint =
        confirmedFingerprint;

      this.emitNetworkChange(
        'connection-properties'
      );
    }, this.changeConfirmationDelayMs);
  }

  private handleOffline(): void {
    this.wasOffline = true;
    this.lastFingerprint = this.buildFingerprint();
  }

  private handleOnline(): void {
    const reconnected = this.wasOffline;

    this.wasOffline = false;
    this.lastFingerprint = this.buildFingerprint();

    if (reconnected) {
      this.emitNetworkChange('reconnected');
    }
  }

  private emitNetworkChange(
    reason: NetworkChangeReason
  ): void {
    const now = Date.now();

if (now - this.startedAt < this.startupDelayMs) {
  return;
}

if (now - this.lastEmissionAt < this.notificationCooldownMs) {
  return;
}


    this.lastEmissionAt = now;

    const currentConnection = this.getConnection();

    this.networkChangedSubject.next({
      reason,
      online:
        typeof navigator !== 'undefined'
          ? navigator.onLine
          : true,
      networkType:
        currentConnection?.type ?? 'unknown',
      effectiveType:
        currentConnection?.effectiveType ?? 'unknown'
    });
  }

  private buildFingerprint(): string {
    if (typeof navigator === 'undefined') {
      return 'server';
    }

    const currentConnection = this.getConnection();

    return [
      navigator.onLine ? 'online' : 'offline',
      currentConnection?.type ?? 'unknown',
      currentConnection?.effectiveType ?? 'unknown',
      currentConnection?.saveData
        ? 'save-data'
        : 'normal-data'
    ].join('|');
  }

  private getConnection():
    BrowserNetworkInformation | null {
    if (typeof navigator === 'undefined') {
      return null;
    }

    const browserNavigator =
      navigator as NavigatorWithNetworkInformation;

    return (
      browserNavigator.connection ??
      browserNavigator.mozConnection ??
      browserNavigator.webkitConnection ??
      null
    );
  }
}
