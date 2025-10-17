import SimplePeer from 'simple-peer';
import { doc, setDoc, onSnapshot, collection, deleteDoc, serverTimestamp, getFirestore } from 'firebase/firestore';
import { getFirebaseApp } from '../firebaseClient';

export type VoiceParticipant = {
  userId: string;
  displayName: string;
  isMuted: boolean;
  isSpeaking: boolean;
  peerId?: string;
};

export type VoiceChatManager = {
  initialize: (partyId: string, userId: string, displayName: string) => Promise<void>;
  cleanup: () => void;
  toggleMute: () => void;
  isMuted: () => boolean;
  getParticipants: () => VoiceParticipant[];
  onParticipantsChange: (callback: (participants: VoiceParticipant[]) => void) => void;
  onSpeakingChange: (callback: (userId: string, isSpeaking: boolean) => void) => void;
};

class WebVoiceChat {
  private partyId: string | null = null;
  private userId: string | null = null;
  private displayName: string | null = null;
  private localStream: MediaStream | null = null;
  private peers: Map<string, SimplePeer.Instance> = new Map();
  private muted: boolean = true; // Start muted
  private unsubscribers: Array<() => void> = [];
  private participantsCallback: ((participants: VoiceParticipant[]) => void) | null = null;
  private speakingCallback: ((userId: string, isSpeaking: boolean) => void) | null = null;
  private participants: Map<string, VoiceParticipant> = new Map();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private speakingCheckInterval: number | null = null;
  private audioElements: Map<string, HTMLAudioElement> = new Map(); // Store audio elements
  private pendingSignals: Map<string, any> = new Map(); // Store signals received before peer creation

  async initialize(partyId: string, userId: string, displayName: string): Promise<void> {
    this.partyId = partyId;
    this.userId = userId;
    this.displayName = displayName;

    try {
      // Get microphone access
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      // Mute by default
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });

      // Setup audio level detection
      this.setupAudioLevelDetection();

      // Add our signal to Firestore
      await this.updateSignal();

      // Listen for other participants
      this.subscribeToSignals();

    } catch (error) {
      console.error('[VoiceChat] Failed to initialize:', error);
      throw error;
    }
  }

  private setupAudioLevelDetection(): void {
    if (!this.localStream) return;

    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.localStream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    source.connect(this.analyser);

    // Check audio level every 100ms
    this.speakingCheckInterval = window.setInterval(() => {
      if (!this.analyser || this.muted) {
        if (this.speakingCallback && this.userId) {
          this.speakingCallback(this.userId, false);
        }
        return;
      }

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);

      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const isSpeaking = average > 20; // Threshold for speaking

      if (this.speakingCallback && this.userId) {
        this.speakingCallback(this.userId, isSpeaking);
      }

      // Update Firestore with speaking status
      this.updateSignal({ isSpeaking });
    }, 100);
  }

  private async updateSignal(updates?: Partial<VoiceParticipant>): Promise<void> {
    if (!this.partyId || !this.userId) return;

    const db = getFirestore(getFirebaseApp());
    const signalRef = doc(db, 'watchParties', this.partyId, 'voiceSignals', this.userId);
    await setDoc(signalRef, {
      userId: this.userId,
      displayName: this.displayName,
      isMuted: this.muted,
      isSpeaking: false,
      peerId: this.userId,
      timestamp: serverTimestamp(),
      ...updates
    }, { merge: true });
  }

  private subscribeToSignals(): void {
    if (!this.partyId) return;

    const db = getFirestore(getFirebaseApp());
    const signalsRef = collection(db, 'watchParties', this.partyId, 'voiceSignals');
    const unsubscribe = onSnapshot(signalsRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const participantUserId = change.doc.id;

        if (change.type === 'added') {
          console.log(`[VoiceChat] Participant added: ${participantUserId}`);
          // Add participant to our list
          this.participants.set(participantUserId, data as VoiceParticipant);
          this.notifyParticipantsChange();

          // If it's not us, initiate WebRTC connection
          if (participantUserId !== this.userId) {
            this.connectToPeer(participantUserId, data as VoiceParticipant, true);
          }
        } else if (change.type === 'modified') {
          // Check if there are signals for us
          if (data.signals && data.signals[this.userId!]) {
            const signalData = JSON.parse(data.signals[this.userId!]);
            console.log(`[VoiceChat] Received signal from ${participantUserId}:`, signalData.type);
            const peer = this.peers.get(participantUserId);

            if (peer) {
              try {
                peer.signal(signalData);
                console.log(`[VoiceChat] Signal processed for existing peer ${participantUserId}`);
              } catch (err) {
                console.error(`[VoiceChat] Error processing signal from ${participantUserId}:`, err);
              }
            } else if (participantUserId !== this.userId) {
              // We don't have a peer yet, create one as non-initiator and store signal
              console.log(`[VoiceChat] Creating non-initiator peer for ${participantUserId}`);
              this.pendingSignals.set(participantUserId, signalData);
              this.connectToPeer(participantUserId, data as VoiceParticipant, false);
            }
          }

          // Update participant info (mute/speaking status)
          this.participants.set(participantUserId, data as VoiceParticipant);
          this.notifyParticipantsChange();

          if (data.isSpeaking && this.speakingCallback) {
            this.speakingCallback(participantUserId, data.isSpeaking);
          }
        } else if (change.type === 'removed') {
          // Participant left
          console.log(`[VoiceChat] Participant removed: ${participantUserId}`);
          this.disconnectPeer(participantUserId);
          this.participants.delete(participantUserId);
          this.notifyParticipantsChange();
        }
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  private connectToPeer(peerId: string, participant: VoiceParticipant, initiator: boolean): void {
    if (!this.localStream || this.peers.has(peerId)) {
      console.log(`[VoiceChat] Skipping peer creation - ${!this.localStream ? 'no stream' : 'peer exists'}`);
      return;
    }

    console.log(`[VoiceChat] ${initiator ? 'Initiating' : 'Accepting'} connection with ${participant.displayName} (${peerId})`);

    const peer = new SimplePeer({
      initiator,
      stream: this.localStream,
      trickle: true
    });

    peer.on('signal', (signal) => {
      console.log(`[VoiceChat] Sending ${signal.type} signal to ${peerId}`);
      // Send signal to other peer via Firestore
      this.sendSignalToPeer(peerId, signal);
    });

    peer.on('connect', () => {
      console.log(`[VoiceChat] ✅ Connected to ${participant.displayName}`);
    });

    peer.on('stream', (remoteStream) => {
      console.log(`[VoiceChat] 🔊 Received audio stream from ${participant.displayName}`);
      // Play remote audio
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.autoplay = true;
      audio.play().then(() => {
        console.log(`[VoiceChat] Playing audio from ${participant.displayName}`);
      }).catch(err => {
        console.error(`[VoiceChat] Failed to play audio from ${participant.displayName}:`, err);
      });
      this.audioElements.set(peerId, audio);
    });

    peer.on('error', (err) => {
      console.error(`[VoiceChat] Peer error with ${participant.displayName}:`, err);
      this.disconnectPeer(peerId);
    });

    peer.on('close', () => {
      console.log(`[VoiceChat] Connection closed with ${participant.displayName}`);
      this.disconnectPeer(peerId);
    });

    this.peers.set(peerId, peer);
    this.participants.set(peerId, participant);
    this.notifyParticipantsChange();

    // If there's a pending signal, process it immediately
    const pendingSignal = this.pendingSignals.get(peerId);
    if (pendingSignal) {
      console.log(`[VoiceChat] Processing pending signal for ${peerId}`);
      try {
        peer.signal(pendingSignal);
        this.pendingSignals.delete(peerId);
      } catch (err) {
        console.error(`[VoiceChat] Error processing pending signal:`, err);
      }
    }
  }

  private async sendSignalToPeer(peerId: string, signal: SimplePeer.SignalData): Promise<void> {
    if (!this.partyId || !this.userId) return;

    const db = getFirestore(getFirebaseApp());
    const signalRef = doc(db, 'watchParties', this.partyId, 'voiceSignals', this.userId);

    console.log(`[VoiceChat] Writing ${signal.type} signal to Firestore for peer ${peerId}`);

    try {
      await setDoc(signalRef, {
        signals: {
          [peerId]: JSON.stringify(signal)
        },
        timestamp: serverTimestamp()
      }, { merge: true });
      console.log(`[VoiceChat] Signal written successfully`);
    } catch (err) {
      console.error(`[VoiceChat] Failed to write signal to Firestore:`, err);
    }
  }

  private disconnectPeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.destroy();
      this.peers.delete(peerId);
    }

    // Clean up audio element
    const audio = this.audioElements.get(peerId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      this.audioElements.delete(peerId);
    }

    // Clean up any pending signals
    this.pendingSignals.delete(peerId);
  }

  toggleMute(): void {
    this.muted = !this.muted;

    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.muted;
      });
    }

    this.updateSignal({ isMuted: this.muted });
  }

  isMuted(): boolean {
    return this.muted;
  }

  getParticipants(): VoiceParticipant[] {
    return Array.from(this.participants.values());
  }

  onParticipantsChange(callback: (participants: VoiceParticipant[]) => void): void {
    this.participantsCallback = callback;
  }

  onSpeakingChange(callback: (userId: string, isSpeaking: boolean) => void): void {
    this.speakingCallback = callback;
  }

  private notifyParticipantsChange(): void {
    if (this.participantsCallback) {
      this.participantsCallback(this.getParticipants());
    }
  }

  cleanup(): void {
    console.log('[VoiceChat] Cleaning up voice chat');

    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    this.peers.forEach(peer => peer.destroy());
    this.peers.clear();

    // Clean up all audio elements
    this.audioElements.forEach(audio => {
      audio.pause();
      audio.srcObject = null;
    });
    this.audioElements.clear();

    // Stop audio analysis
    if (this.speakingCheckInterval) {
      clearInterval(this.speakingCheckInterval);
      this.speakingCheckInterval = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Unsubscribe from Firestore
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    // Remove our signal from Firestore
    if (this.partyId && this.userId) {
      const db = getFirestore(getFirebaseApp());
      const signalRef = doc(db, 'watchParties', this.partyId, 'voiceSignals', this.userId);
      deleteDoc(signalRef).catch(console.error);
    }

    this.participants.clear();
    this.pendingSignals.clear();
    this.partyId = null;
    this.userId = null;
  }
}

export const createVoiceChatManager = (): VoiceChatManager => {
  const voiceChat = new WebVoiceChat();
  return {
    initialize: voiceChat.initialize.bind(voiceChat),
    cleanup: voiceChat.cleanup.bind(voiceChat),
    toggleMute: voiceChat.toggleMute.bind(voiceChat),
    isMuted: voiceChat.isMuted.bind(voiceChat),
    getParticipants: voiceChat.getParticipants.bind(voiceChat),
    onParticipantsChange: voiceChat.onParticipantsChange.bind(voiceChat),
    onSpeakingChange: voiceChat.onSpeakingChange.bind(voiceChat)
  };
};
