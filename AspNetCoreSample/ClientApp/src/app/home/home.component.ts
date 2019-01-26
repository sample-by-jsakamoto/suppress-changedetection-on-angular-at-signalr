import { Component, OnInit, OnDestroy } from '@angular/core';
import { HubConnectionBuilder, LogLevel, JsonHubProtocol, HubConnection } from '@aspnet/signalr';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit, OnDestroy {

  private hubConn: HubConnection;

  ngOnInit(): void {
    const builder = new HubConnectionBuilder();
    this.hubConn = builder
      .configureLogging(LogLevel.Error)
      .withHubProtocol(new JsonHubProtocol())
      .withUrl('/hubs/sample')
      .build();
    this.hubConn.start().then(() => {
      console.log('SignalR connected.');
    });
  }

  ngOnDestroy(): void {
    this.hubConn.stop();
  }

  onClickRemoteIncrement(): void {
    this.hubConn.invoke('RemoteIncrement');
  }
}
