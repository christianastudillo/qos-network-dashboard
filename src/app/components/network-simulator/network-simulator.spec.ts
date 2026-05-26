import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkSimulator } from './network-simulator';

describe('NetworkSimulator', () => {
  let component: NetworkSimulator;
  let fixture: ComponentFixture<NetworkSimulator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NetworkSimulator],
    }).compileComponents();

    fixture = TestBed.createComponent(NetworkSimulator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
