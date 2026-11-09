// Whether the API is in the middle of a job that needs it quiet: the swap of the database file in a
// restore. While it is on, the tasks of the clock hold back and `GET /health` does not say `ok`.
// In memory, one flag; whoever turns it on turns it off.
export class MaintenanceGate {
  private active = false;

  begin(): void {
    this.active = true;
  }

  end(): void {
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }
}
