import Ember from 'ember';
import Checker from 'ember-pusher-guru/mixins/checker';
import { fetchEvents } from 'ember-pusher-guru/utils/extract-events';
import getOwner from 'ember-getowner-polyfill';

const { get, computed, run, Logger, Service } = Ember;
const { bind } = run;
const { error } = Logger;

export default Service.extend(Ember.Evented, Checker, {
  pusher: null,
  pusherKey: null,

  pusherConfig: {
    authEndpoint: null,
    authDataParams: null,
    authDataHeaders: null,
    encrypted: true,
    cluster: null,
    disableStats: null,
    enabledTransports: null,
    disabledTransports: null,
    ignoreNullOrigin: null,
    activityTimeout: null,
    pongTimeout: null,
  },

  init() {
    this._super(...arguments);
    this.set('pusherKey', getOwner(this).resolveRegistration('config:environment').pusherKey);
    this.setup();
  },

  willDestroy() {
    if (get(this, 'pusher.disconnect')) {
      this.get('pusher').disconnect();
    }
  },

  setup() {
    this.checkEnv();
    this.set('pusher', new Pusher(this.get('pusherKey'), this._findOptions()));

    this._setSubscriptionsEndEvents();
  },

  subscribeTo(singleChannel) {
    let channelsData = this.get('channelsData');
    channelsData.push(singleChannel);
    this._subscribe(singleChannel);
  },

  _findOptions() {
    const options = {};
    Object.keys(this.get('pusherConfig')).forEach((key) => {
      if (get(this, `pusherConfig.${key}`) !== null) {
        options[key] = get(this, `pusherConfig.${key}`);
      }
    });
    const endpoint = this.get('authEndpoint');
    if(endpoint) {
      options.authEndpoint = endpoint;
      options.authTransport = 'jsonp';
      options.encrypted = true;
      options.auth = { params: this.get('authDataParams') };
      Ember.deprecate(
        'ember-pusher-guru: using `authEndpoint` outside `pusherConfig` is depreciated',
        true,
        { id: 'ember-pusher-guru-authEndpoint', until: new Date(2016, 12, 31) }
      );
    }
   return options;
  },

  _setSubscriptionsEndEvents() {
    this.get('channelsData').forEach(singleChannel => this._subscribe(singleChannel));

    this.get('pusher').connection.bind('connected', (err, res) => {
      return this._connected();
    });
  },

  _subscribe(singleChannel) {
    const channelName = Object.keys(singleChannel)[0];
    const channel = this._addChannel(channelName);

    if (channel) {
      const events = fetchEvents([singleChannel], channelName);
      this._attachEventsToChannel(channel, events);
    }
  },

  _addChannel(name) {
    const pusher = get(this, 'pusher');

    if (!pusher.channel(name)) {
      return this.get('pusher').subscribe(name);
    }
  },

  _attachEventsToChannel(channel, events) {
    events.forEach((event) => {
      this._setEvent(channel, event);
    });
  },

  _setEvent(channel, event) {
    channel.bind(event, (data) => {
      run(() => {
        this.trigger('newEvent', event, data);
      });
    });
  },

  _connected() {
    this.set('socketId', this.get('pusher').connection.socket_id);
    return this._addSocketIdToXHR();
  },

  _addSocketIdToXHR() {
    Ember.$.ajaxPrefilter((options, originalOptions, xhr) => {
      return xhr.setRequestHeader('X-Pusher-Socket', this.socketId);
    });
  },
});
