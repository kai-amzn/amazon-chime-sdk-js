// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  BaseConnectionHealthPolicy,
  ConnectionHealthData,
  ConnectionHealthPolicy,
  ConnectionHealthPolicyConfiguration,
} from '../../../../src/index';

export default class CustomReconnectionHealthPolicy extends BaseConnectionHealthPolicy
  implements ConnectionHealthPolicy {
  private static CONNECTION_UNHEALTHY_THRESHOLD: number;
  private static NO_SIGNAL_THRESHOLD_TIME_MS: number;
  private static CONNECTION_WAIT_TIME_MS: number;
  private static MISSED_PONGS_THRESHOLD: number;
  private static MAXIMUM_AUDIO_DELAY_MS: number;
  private static MAXIMUM_AUDIO_DELAY_DATA_POINTS: number;

  private audioDelayPointsOverMaximum = 0;

  constructor(
    configuration: ConnectionHealthPolicyConfiguration,
    connectionWaitTimeMs: number
  ) {
    super(configuration, new ConnectionHealthData());
    CustomReconnectionHealthPolicy.CONNECTION_UNHEALTHY_THRESHOLD =
      configuration.connectionUnhealthyThreshold;
    CustomReconnectionHealthPolicy.NO_SIGNAL_THRESHOLD_TIME_MS = configuration.noSignalThresholdTimeMs;
    // Uses a constructor argument "connectionWaitTimeMs" because "configuration.connectionWaitTimeMs"
    // is set to Infinity in the meeting session configuration to disable SDK's ReconnectionHealthPolicy.
    CustomReconnectionHealthPolicy.CONNECTION_WAIT_TIME_MS = connectionWaitTimeMs;
    CustomReconnectionHealthPolicy.MISSED_PONGS_THRESHOLD = configuration.missedPongsUpperThreshold;
    CustomReconnectionHealthPolicy.MAXIMUM_AUDIO_DELAY_MS = configuration.maximumAudioDelayMs;
    CustomReconnectionHealthPolicy.MAXIMUM_AUDIO_DELAY_DATA_POINTS =
      configuration.maximumAudioDelayDataPoints;
  }

  health(): number {
    const connectionStartedRecently = this.currentData.isConnectionStartRecent(
      CustomReconnectionHealthPolicy.CONNECTION_WAIT_TIME_MS
    );
    if (connectionStartedRecently) {
      return 1;
    }
    const noPacketsReceivedRecently =
      this.currentData.consecutiveStatsWithNoPackets >=
      CustomReconnectionHealthPolicy.CONNECTION_UNHEALTHY_THRESHOLD;
    const noSignalStatusReceivedRecently = this.currentData.isNoSignalRecent(
      CustomReconnectionHealthPolicy.NO_SIGNAL_THRESHOLD_TIME_MS
    );
    const missedPongsRecently =
      this.currentData.consecutiveMissedPongs >= CustomReconnectionHealthPolicy.MISSED_PONGS_THRESHOLD;
    if (this.currentData.audioSpeakerDelayMs > CustomReconnectionHealthPolicy.MAXIMUM_AUDIO_DELAY_MS) {
      this.audioDelayPointsOverMaximum += 1;
    } else {
      this.audioDelayPointsOverMaximum = 0;
    }
    const hasBadAudioDelay =
      this.audioDelayPointsOverMaximum > CustomReconnectionHealthPolicy.MAXIMUM_AUDIO_DELAY_DATA_POINTS;
    if (hasBadAudioDelay) {
      this.audioDelayPointsOverMaximum = 0;
    }
    const needsReconnect =
      noPacketsReceivedRecently ||
      noSignalStatusReceivedRecently ||
      missedPongsRecently ||
      hasBadAudioDelay;
    if (needsReconnect) {
      console.warn(
        `reconnection recommended due to: no packets received: ${noPacketsReceivedRecently}, no signal status received: ${noSignalStatusReceivedRecently}, missed pongs: ${missedPongsRecently}, bad audio delay: ${hasBadAudioDelay}`
      );
      return 0;
    }
    return 1;
  }
}
