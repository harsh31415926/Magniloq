export class VideoRecorder {
  constructor() {
    this.stream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordingInterval = null;
    this.recordingSeconds = 0;
    this.videoURL = null;
    this.isPaused = false;
    this.pausedTime = 0;

    // Elements
    this.panel = document.getElementById('recorder-panel');
    this.topicTitleEl = document.getElementById('recorder-topic-title');
    this.videoEl = document.getElementById('recorder-video');
    this.indicatorEl = document.getElementById('recorder-indicator');
    this.timeEl = document.getElementById('recorder-time');
    this.errorEl = document.getElementById('recorder-error');
    
    this.ctrlBefore = document.getElementById('recorder-controls-before');
    this.ctrlRecording = document.getElementById('recorder-controls-recording');
    this.ctrlAfter = document.getElementById('recorder-controls-after');

    this.btnStart = document.getElementById('btn-start-record');
    this.btnStop = document.getElementById('btn-stop-record');
    this.btnPause = document.getElementById('btn-pause-record');
    this.btnResume = document.getElementById('btn-resume-record');
    this.btnReplay = document.getElementById('btn-replay-record');
    this.btnRetake = document.getElementById('btn-retake-record');
    this.btnDownload = document.getElementById('btn-download-record');

    this.setupListeners();
  }

  setupListeners() {
    this.btnStart.addEventListener('click', () => this.startRecording());
    this.btnStop.addEventListener('click', () => this.stopRecording());
    if (this.btnPause) {
      this.btnPause.addEventListener('click', () => this.pauseRecording());
    }
    if (this.btnResume) {
      this.btnResume.addEventListener('click', () => this.resumeRecording());
    }
    this.btnReplay.addEventListener('click', () => this.replayVideo());
    this.btnRetake.addEventListener('click', () => this.retakeVideo());
    this.btnDownload.addEventListener('click', (e) => {
      e.preventDefault();
      this.downloadVideo();
    });
  }

  showPanel(topicTitle) {
    this.panel.classList.remove('hidden');
    this.topicTitleEl.textContent = `Speak on this topic: "${topicTitle}"`;
    // Also use title for filename later
    this.currentTopic = topicTitle;
    this.resetState();
  }

  hidePanel() {
    this.panel.classList.add('hidden');
    this.stopMediaTracks();
  }

  resetState() {
    this.stopMediaTracks();
    this.recordedChunks = [];
    this.isPaused = false;
    this.pausedTime = 0;
    if (this.videoURL) {
      URL.revokeObjectURL(this.videoURL);
      this.videoURL = null;
    }
    
    this.videoEl.srcObject = null;
    this.videoEl.src = '';
    this.videoEl.muted = true;
    this.videoEl.removeAttribute('controls');
    
    this.errorEl.classList.add('hidden');
    this.ctrlBefore.classList.remove('hidden');
    this.ctrlRecording.classList.add('hidden');
    this.ctrlAfter.classList.add('hidden');
    this.indicatorEl.classList.remove('active');
    
    clearInterval(this.recordingInterval);
    this.timeEl.textContent = '00:00';
    this.recordingSeconds = 0;
  }

  async startRecording() {
    try {
      this.errorEl.classList.add('hidden');
      const successEl = document.getElementById('recorder-success');
      if (successEl) successEl.classList.add('hidden');
      
      this.btnStart.textContent = 'Requesting access...';
      this.btnStart.disabled = true;

      // Check if media devices are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support camera/microphone access. Please try a modern browser like Chrome, Firefox, or Safari.");
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      this.videoEl.srcObject = this.stream;
      this.videoEl.muted = true; // Mute live preview to avoid feedback loop
      this.videoEl.classList.remove('playback');
      this.videoEl.play();

      // Find supported mime type
      const types = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4"
      ];
      let options = { mimeType: "" };
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          options.mimeType = type;
          break;
        }
      }

      if (!options.mimeType) {
        throw new Error("Your browser does not support video recording. Please try a different browser.");
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.finalizeRecording();
      };

      this.mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        this.showError("Recording failed. Please try again.");
        this.resetState();
      };

      this.mediaRecorder.start();
      
      this.ctrlBefore.classList.add('hidden');
      this.ctrlRecording.classList.remove('hidden');
      this.indicatorEl.classList.add('active');
      this.indicatorEl.innerHTML = `● Recording <span id="recorder-time">00:00</span>`;
      
      // Reset pause/resume buttons
      if (this.btnPause) this.btnPause.classList.remove('hidden');
      if (this.btnResume) this.btnResume.classList.add('hidden');
      
      this.recordingSeconds = 0;
      this.recordingInterval = setInterval(() => {
        this.recordingSeconds++;
        const timeEl = document.getElementById('recorder-time');
        if (timeEl) {
          timeEl.textContent = this.formatTime(this.recordingSeconds);
        }
      }, 1000);

    } catch (err) {
      console.error("Error accessing media devices.", err);
      let errorMessage = "Could not access camera/microphone. Please check permissions.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = "Camera and microphone access is required to record your response. Please allow access in your browser settings and try again.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = "No camera or microphone found. Please ensure your devices are connected and try again.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = "Could not access camera/microphone. Another application might be using them. Please close other apps and try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      this.showError(errorMessage);
    } finally {
      this.btnStart.textContent = '🎥 Start Recording';
      this.btnStart.disabled = false;
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    clearInterval(this.recordingInterval);
    this.indicatorEl.classList.remove('active');
    this.stopMediaTracks();
  }

  pauseRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isPaused = true;
      clearInterval(this.recordingInterval);
      this.indicatorEl.innerHTML = '⏸ PAUSED';
      this.indicatorEl.classList.remove('active');
      this.indicatorEl.classList.add('paused');
      
      // Show resume button, hide pause button
      if (this.btnPause) this.btnPause.classList.add('hidden');
      if (this.btnResume) this.btnResume.classList.remove('hidden');
    }
  }

  resumeRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.isPaused = false;
      this.indicatorEl.innerHTML = `● Recording <span id="recorder-time">${this.formatTime(this.recordingSeconds)}</span>`;
      this.indicatorEl.classList.add('active');
      this.indicatorEl.classList.remove('paused');
      
      // Resume timer
      this.recordingInterval = setInterval(() => {
        this.recordingSeconds++;
        const timeEl = document.getElementById('recorder-time');
        if (timeEl) {
          timeEl.textContent = this.formatTime(this.recordingSeconds);
        }
      }, 1000);
      
      // Show pause button, hide resume button
      if (this.btnPause) this.btnPause.classList.remove('hidden');
      if (this.btnResume) this.btnResume.classList.add('hidden');
    }
  }

  formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  finalizeRecording() {
    const blob = new Blob(this.recordedChunks, {
      type: this.mediaRecorder.mimeType || 'video/webm'
    });
    this.videoURL = URL.createObjectURL(blob);
    
    // Switch preview to playback
    this.videoEl.srcObject = null;
    this.videoEl.src = this.videoURL;
    this.videoEl.muted = false; // Unmute for playback
    this.videoEl.setAttribute('controls', '');
    this.videoEl.classList.add('playback');
    
    this.ctrlRecording.classList.add('hidden');
    this.ctrlAfter.classList.remove('hidden');
    
    // Prepare download with improved filename format: DATE_TIME_TOPIC.webm
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const safeTopic = this.sanitizeFilename(this.currentTopic || "topic");
    const ext = (this.mediaRecorder.mimeType || '').includes('mp4') ? 'mp4' : 'webm';
    this.downloadFilename = `${dateStr}_${timeStr}_${safeTopic}.${ext}`;
    this.btnDownload.download = this.downloadFilename;
    
    // Save to recording history
    this.saveToHistory({
      topic: this.currentTopic,
      date: dateStr,
      time: timeStr,
      duration: this.recordingSeconds,
      filename: this.btnDownload.download
    });
    
    // Show success message
    this.showSuccess(`Recording saved! Duration: ${this.formatTime(this.recordingSeconds)}`);
    
    // Trigger history update in main app
    if (window.renderRecordingHistory) {
      window.renderRecordingHistory();
    }
  }

  showSuccess(message) {
    this.errorEl.classList.add('hidden');
    const successEl = document.getElementById('recorder-success');
    if (successEl) {
      successEl.textContent = message;
      successEl.classList.remove('hidden');
      setTimeout(() => successEl.classList.add('hidden'), 5000);
    }
  }

  showError(message) {
    const successEl = document.getElementById('recorder-success');
    if (successEl) successEl.classList.add('hidden');
    
    this.errorEl.textContent = message;
    this.errorEl.classList.remove('hidden');
  }

  sanitizeFilename(topic) {
    return topic
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length
  }

  saveToHistory(metadata) {
    try {
      const history = JSON.parse(localStorage.getItem('magniloq_recording_history') || '[]');
      history.unshift(metadata);
      // Keep only last 20 recordings
      if (history.length > 20) {
        history.pop();
      }
      localStorage.setItem('magniloq_recording_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save recording history:', e);
    }
  }

  replayVideo() {
    this.videoEl.currentTime = 0;
    this.videoEl.play();
  }

  downloadVideo() {
    if (!this.videoURL) return;
    
    const a = document.createElement('a');
    a.href = this.videoURL;
    a.download = this.downloadFilename || this.btnDownload.download;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    this.showSuccess('Recording downloaded successfully!');
  }

  retakeVideo() {
    if (confirm("Are you sure you want to discard this recording and start over?")) {
      this.resetState();
    }
  }

  stopMediaTracks() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  getRecordingHistory() {
    try {
      return JSON.parse(localStorage.getItem('magniloq_recording_history') || '[]');
    } catch (e) {
      console.warn('Could not load recording history:', e);
      return [];
    }
  }

  clearRecordingHistory() {
    try {
      localStorage.removeItem('magniloq_recording_history');
    } catch (e) {
      console.warn('Could not clear recording history:', e);
    }
  }
}
