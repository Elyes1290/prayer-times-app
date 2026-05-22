<?php
/**
 * Durée réelle d'un MP3 sur disque (pour l'API streaming).
 */

function getMp3DurationSeconds(string $filePath): float {
    if (!is_file($filePath) || !is_readable($filePath)) {
        return 0.0;
    }

    $fileSize = filesize($filePath);
    if ($fileSize === false || $fileSize < 1024) {
        return 0.0;
    }

    $duration = tryFfprobeDuration($filePath);
    if ($duration > 0) {
        return $duration;
    }

    $duration = readId3TlenSeconds($filePath);
    if ($duration > 0) {
        return $duration;
    }

    $duration = readXingOrVbriDurationSeconds($filePath);
    if ($duration > 0) {
        return $duration;
    }

    // Fichiers modestes : scan complet des trames (précis)
    if ($fileSize <= 15 * 1024 * 1024) {
        $scanned = scanMp3DurationSeconds($filePath);
        if ($scanned > 0) {
            return $scanned;
        }
    }

    // Gros fichiers VBR : débit moyen échantillonné (évite 76 min au lieu de 124 min)
    $avgBitrate = estimateAverageBitrateKbps($filePath, $fileSize);
    if ($avgBitrate > 0) {
        return ($fileSize * 8) / ($avgBitrate * 1000);
    }

    $bitrateKbps = readMp3BitrateKbpsAtOffset($filePath, 0);
    if ($bitrateKbps > 0) {
        return ($fileSize * 8) / ($bitrateKbps * 1000);
    }

    return 0.0;
}

function tryFfprobeDuration(string $filePath): float {
    if (!function_exists('shell_exec')) {
        return 0.0;
    }
    $disabled = array_map('trim', explode(',', (string)ini_get('disable_functions')));
    if (in_array('shell_exec', $disabled, true)) {
        return 0.0;
    }

    $ffprobe = trim((string)@shell_exec('command -v ffprobe 2>/dev/null'));
    if ($ffprobe === '') {
        return 0.0;
    }

    $cmd = escapeshellcmd($ffprobe)
        . ' -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 '
        . escapeshellarg($filePath)
        . ' 2>/dev/null';
    $out = @shell_exec($cmd);
    if ($out !== null && is_numeric(trim($out))) {
        $d = (float)trim($out);
        return $d > 0 ? $d : 0.0;
    }

    return 0.0;
}

/** ID3v2 TLEN = longueur en millisecondes */
function readId3TlenSeconds(string $filePath): float {
    $fp = @fopen($filePath, 'rb');
    if (!$fp) {
        return 0.0;
    }
    $header = fread($fp, 10);
    if ($header === false || substr($header, 0, 3) !== 'ID3') {
        fclose($fp);
        return 0.0;
    }
    $tagSize = 0;
    for ($i = 0; $i < 4; $i++) {
        $tagSize = ($tagSize << 7) + (ord($header[6 + $i]) & 0x7f);
    }
    $tagData = fread($fp, min($tagSize, 256 * 1024));
    fclose($fp);
    if ($tagData === false) {
        return 0.0;
    }
    $pos = 0;
    $len = strlen($tagData);
    while ($pos + 10 < $len) {
        $frameId = substr($tagData, $pos, 4);
        $frameSize = 0;
        for ($i = 0; $i < 4; $i++) {
            $frameSize = ($frameSize << 7) + (ord($tagData[$pos + 4 + $i]) & 0x7f);
        }
        $pos += 10;
        if ($frameSize <= 0 || $pos + $frameSize > $len) {
            break;
        }
        if ($frameId === 'TLEN') {
            $ms = (int)preg_replace('/\D/', '', substr($tagData, $pos, $frameSize));
            if ($ms > 0) {
                return $ms / 1000.0;
            }
        }
        $pos += $frameSize;
    }
    return 0.0;
}

/** Xing / Info / VBRI (durée exacte des encodeurs LAME, etc.) */
function readXingOrVbriDurationSeconds(string $filePath): float {
    $fp = @fopen($filePath, 'rb');
    if (!$fp) {
        return 0.0;
    }
    $audioStart = skipId3v2($fp);
    $searchLen = min(512 * 1024, max(0, filesize($filePath) - $audioStart));
    fseek($fp, $audioStart);
    $chunk = fread($fp, $searchLen);
    fclose($fp);
    if ($chunk === false || strlen($chunk) < 128) {
        return 0.0;
    }

    foreach (['Xing', 'Info', 'VBRI'] as $magic) {
        $pos = strpos($chunk, $magic);
        if ($pos === false) {
            continue;
        }
        if ($magic === 'VBRI' && $pos + 26 <= strlen($chunk)) {
            $bytes = substr($chunk, $pos + 14, 4);
            $samples = unpack('N', $bytes)[1];
            if ($samples > 0) {
                return $samples / 44100.0;
            }
        }
        if (($magic === 'Xing' || $magic === 'Info') && $pos + 16 <= strlen($chunk)) {
            $flags = unpack('N', substr($chunk, $pos + 4, 4))[1];
            if ($flags & 0x01) {
                $frames = unpack('N', substr($chunk, $pos + 8, 4))[1];
                if ($frames > 0) {
                    return ($frames * 1152) / 44100.0;
                }
            }
        }
    }
    return 0.0;
}

/** Débit moyen sur plusieurs positions du fichier (fichiers VBR longs). */
function estimateAverageBitrateKbps(string $filePath, int $fileSize): int {
    $fp = @fopen($filePath, 'rb');
    if (!$fp) {
        return 0;
    }
    $audioStart = skipId3v2($fp);
    fclose($fp);

    $audioBytes = max(1, $fileSize - $audioStart);
    $samples = [0.0, 0.05, 0.15, 0.35, 0.55, 0.75, 0.9];
    $bitrates = [];

    foreach ($samples as $ratio) {
        $offset = $audioStart + (int)floor($audioBytes * $ratio);
        $br = readMp3BitrateKbpsAtOffset($filePath, $offset);
        if ($br > 0) {
            $bitrates[] = $br;
        }
    }

    if (count($bitrates) === 0) {
        return 0;
    }
    sort($bitrates);
    $mid = (int)floor(count($bitrates) / 2);
    return $bitrates[$mid];
}

function readMp3BitrateKbpsAtOffset(string $filePath, int $byteOffset): int {
    $fp = @fopen($filePath, 'rb');
    if (!$fp) {
        return 0;
    }
    if ($byteOffset <= 0) {
        $byteOffset = skipId3v2($fp);
    } else {
        fseek($fp, $byteOffset);
    }
    $chunk = fread($fp, 65536);
    fclose($fp);

    if ($chunk === false || strlen($chunk) < 4) {
        return 0;
    }

    $len = strlen($chunk);
    for ($i = 0; $i < $len - 4; $i++) {
        if (ord($chunk[$i]) !== 0xff) {
            continue;
        }
        $b1 = ord($chunk[$i + 1]);
        if (($b1 & 0xe0) !== 0xe0) {
            continue;
        }
        $info = parseMpegFrameHeader(substr($chunk, $i, 4));
        if ($info && $info['bitrate_kbps'] > 0) {
            return $info['bitrate_kbps'];
        }
    }
    return 0;
}

function scanMp3DurationSeconds(string $filePath): float {
    $fp = @fopen($filePath, 'rb');
    if (!$fp) {
        return 0.0;
    }

    $offset = skipId3v2($fp);
    fseek($fp, $offset);

    $duration = 0.0;
    $maxIterations = 800000;
    $iterations = 0;

    while (!feof($fp) && $iterations < $maxIterations) {
        $iterations++;
        $byte = fread($fp, 1);
        if ($byte === false || strlen($byte) === 0) {
            break;
        }
        if (ord($byte) !== 0xff) {
            continue;
        }
        $rest = fread($fp, 3);
        if ($rest === false || strlen($rest) < 3) {
            break;
        }
        $header = $byte . $rest;
        $b1 = ord($header[1]);
        if (($b1 & 0xe0) !== 0xe0) {
            fseek($fp, ftell($fp) - 3);
            continue;
        }

        $info = parseMpegFrameHeader($header);
        if (!$info || $info['frame_length'] <= 0) {
            fseek($fp, ftell($fp) - 3);
            continue;
        }

        $duration += $info['samples'] / $info['sample_rate'];
        fseek($fp, ftell($fp) + $info['frame_length'] - 4);
    }

    fclose($fp);
    return $duration > 0 ? $duration : 0.0;
}

function skipId3v2($fp): int {
    $start = ftell($fp);
    $header = fread($fp, 10);
    if ($header === false || strlen($header) < 10) {
        fseek($fp, $start);
        return 0;
    }
    if (substr($header, 0, 3) !== 'ID3') {
        fseek($fp, $start);
        return 0;
    }
    $size = 0;
    for ($i = 0; $i < 4; $i++) {
        $size = ($size << 7) + (ord($header[6 + $i]) & 0x7f);
    }
    return 10 + $size;
}

/**
 * @return array{bitrate_kbps:int,sample_rate:int,samples:int,frame_length:int}|null
 */
function parseMpegFrameHeader(string $h) {
    if (strlen($h) < 4) {
        return null;
    }

    $b1 = ord($h[1]);
    $b2 = ord($h[2]);

    $versionBits = ($b1 >> 3) & 3;
    $layerBits = ($b1 >> 1) & 3;
    if ($layerBits === 0) {
        return null;
    }

    $version = 'V1';
    if ($versionBits === 0) {
        $version = 'V2.5';
    } elseif ($versionBits === 2) {
        $version = 'V2';
    } elseif ($versionBits === 3) {
        $version = 'V1';
    } else {
        return null;
    }

    $layer = 4 - $layerBits;

    $bitrateIndex = ($b2 >> 4) & 0x0f;
    $sampleRateIndex = ($b2 >> 2) & 0x03;
    $padding = ($b2 >> 1) & 0x01;

    if ($bitrateIndex === 0 || $bitrateIndex === 15 || $sampleRateIndex === 3) {
        return null;
    }

    $bitrates = [
        'V1L1' => [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
        'V1L2' => [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
        'V1L3' => [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
        'V2L1' => [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
        'V2L2' => [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
        'V2L3' => [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    ];

    $sampleRates = [
        'V1' => [44100, 48000, 32000],
        'V2' => [22050, 24000, 16000],
        'V2.5' => [11025, 12000, 8000],
    ];

    $verKey = ($version === 'V1') ? 'V1' : (($version === 'V2') ? 'V2' : 'V2.5');
    $tableKey = $verKey . 'L' . $layer;
    if (!isset($bitrates[$tableKey])) {
        return null;
    }

    $bitrateKbps = $bitrates[$tableKey][$bitrateIndex];
    if ($bitrateKbps <= 0) {
        return null;
    }

    $sampleRate = $sampleRates[$verKey][$sampleRateIndex];

    if ($layer === 1) {
        $samples = 384;
    } elseif ($layer === 2) {
        $samples = 1152;
    } else {
        $samples = ($version === 'V1') ? 1152 : 576;
    }

    $frameLength = (int)floor((144 * $bitrateKbps * 1000) / $sampleRate) + $padding;
    if ($version !== 'V1' && $layer === 3) {
        $frameLength = (int)floor((72 * $bitrateKbps * 1000) / $sampleRate) + $padding;
    }
    if ($layer === 1) {
        $frameLength = (int)floor((120 * $bitrateKbps * 1000) / $sampleRate) + $padding;
    }

    return [
        'bitrate_kbps' => $bitrateKbps,
        'sample_rate' => $sampleRate,
        'samples' => $samples,
        'frame_length' => $frameLength,
    ];
}
