import { Component, NgZone, OnInit, OnDestroy } from '@angular/core';
import { HubConnectionBuilder, HubConnection, LogLevel, JsonHubProtocol } from '@aspnet/signalr';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'app-counter-component',
  templateUrl: './counter.component.html'
})
export class CounterComponent implements OnInit, OnDestroy {

  private _currentCount = 0;

  private hubConn: HubConnection;

  private reactiveRemoteIncrement: Subject<void> = new Subject<void>();

  private subscription: Subscription = new Subscription();

  public get currentCount(): number {
    console.log('get currentCount()')
    return this._currentCount;
  }

  constructor(
    private zone: NgZone
  ) {
  }

  async ngOnInit(): Promise<void> {

    const builder = new HubConnectionBuilder();
    this.hubConn = builder
      .configureLogging(LogLevel.Error)
      .withHubProtocol(new JsonHubProtocol())
      .withUrl('/hubs/sample')
      .build();

    // ---- HubConnecton.on() での変更検知の抑止 ----

    // // HubConnection.start() はそのままとしつつ、
    // // SignalR からの push 通知を個別に変更検知抑止しようとしても、無駄。
    // // 下記のようなコードにしても、on() 呼び出し後の変更検知が常にスケジュールされているため。
    // this.hubConn.on('RemoteIncrement', () => this.zone.runOutsideAngular(() => this.onRemoteIncrement.bind(this)));

    // // 以下のように HubConnection.on() 呼び出し全体を runOutsideAngular でくるんでも同じ。
    // // 後述のとおり HubConnection.start() を runOutsideAngular でくるまない限りは影響なし。
    // // on() に指定したコールバックで変更検知が走る。
    // this.zone.runOutsideAngular(() => this.hubConn.on('RemoteIncrement', this.onRemoteIncrement.bind(this)));

    // // いっぽう、HubConnection.start() 呼び出しを runOutsideAngular でくるむと、
    // // SignalR からの push 通知では一切、変更検知が走らなくなる。
    // this.hubConn.on('RemoteIncrement', this.onRemoteIncrement.bind(this));

    // // SiganlR からの push 通知を、Subject でつないでも、
    // // HubConnection.start() を runOutsideAngular でくるんでいる限りは変わらず、変更検知が走らない。
    // this.hubConn.on('RemoteIncrement', () => this.reactiveRemoteIncrement.next());
    // this.subscription.add(this.reactiveRemoteIncrement.subscribe(this.onRemoteIncrement.bind(this)));

    // HubConnection.start() 呼び出しを runOutsideAngular でくるんでも、
    // SiganlR からのpush通知から変更検知を走らせるには、後でもでてくるが、
    // NgZone.run でくるむより他ない。
    this.hubConn.on('RemoteIncrement', () => this.zone.run(() => this.onRemoteIncrement.bind(this)));

    // ---- SiganlR 通信での変更検知の抑止は start を runOutsideAngular 内で実行すること ----

    // HubConnection.start() を runOutsideAngular 内で実施すると、
    // 変更検知が抑止される。
    await this.zone.runOutsideAngular(() => this.hubConn.start());

    // // HubConnection.start() を runOutsideAngular でくるまない限りは、
    // // HubConnection.invoke(), HubConnection.on() ともども、
    // // 変更検知を抑止することはできない。
    //await this.hubConn.start();

    console.log('SignalR connected.');
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.hubConn.off('RemoteIncrement');
    this.hubConn.stop();
  }

  onRemoteIncrement(): void {
    console.log('onRemoteIncrement');
    this._currentCount++;
  }

  public incrementCounter() {

    // ---- HubConnecton.invoke() での変更検知の抑止 ----

    // HubConnection.start() を runOutsideAngular 内で実行しない限りは、
    // HubConnection.invoke() を runOutsideAngular でくるんでも・くるまなくても、
    // 変更検知の発動は抑止されない。

    // 1. HubConnection.start() を runOutsideAngular でくるみ、
    // 2. HubConnection.invoke() を runOutsideAngular でくるみ、
    // 3. async/await ではなく .then() でチェーンした場合に、
    // 変更検知の実施が抑止される。(カウンタ増加がレンダリングされない)
    this.zone.runOutsideAngular(() => this.hubConn
      .invoke<string>('Greeting', 'John')
      .then(greeting => { this._currentCount++; console.log(greeting); }));

    // // 上記条件 1~2 を満たしても、条件3 の代わりに async/await すると、
    // // 変更検知は発動する(それが望ましいケースも多々あり) 。
    // const greeting = await this.zone.runOutsideAngular(() => this.hubConn.invoke<string>('Greeting', 'John'));
    // this._currentCount++;
    // console.log(greeting);

    // HubConnection.start() を runOutsideAngular でくるまなかった場合、
    // HubConnection.invoke() を runOutsideAngular でくるんでも、
    // 変更検知の発動は抑止されないが検知タイミングがずれ、
    // 処理後に変更検知が走ってしまい、処理結果がレンダリングされない。

    // // HubConnection.start() を runOutsideAngular でくるんでも、
    // // HubConnection.invoke() を runOutsideAngular でくるまなかった場合は、
    // // 普通に変更検知が走る (カウンタ増加がレンダリングされる)。
    // this.hubConn
    //   .invoke<string>('Greeting', 'John')
    //   .then(greeting => { this._currentCount++; console.log(greeting); });
  }
}
