using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace AspNetCoreSample.Hubs
{
    public class SampleHub : Hub
    {
        public async Task<string> Greeting(string name)
        {
            await Task.Delay(1000);
            return $"Hello, {name}";
        }

        public Task RemoteIncrement()
        {
            return this.Clients.Others.SendAsync("RemoteIncrement");
        }
    }
}
