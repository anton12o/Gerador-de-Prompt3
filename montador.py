#!/usr/bin/env python3
"""
montador.py - Montador Automático de Vídeos Verticais (Shopee / TikTok)
Sincroniza 3 clipes de vídeo do Veo com 3 falas geradas via Gemini TTS.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import wave
from pathlib import Path

# Carregar variáveis de ambiente de .env (se existir)
try:
    from dotenv import load_dotenv
    # Procura .env na pasta atual ou em subpastas como backend/.env
    if Path(".env").exists():
        load_dotenv(".env")
    elif Path("backend/.env").exists():
        load_dotenv("backend/.env")
    else:
        load_dotenv()
except ImportError:
    pass

# ==============================================================================
# CONFIGURAÇÕES E CONSTANTES PRINCIPAIS
# ==============================================================================
TTS_MODEL = "gemini-3.8-flash-tts"      # Modelo padrão de Text-to-Speech
VOICE_NAME = "Puck"                     # Voz unificada para manter o mesmo timbre
STYLE_PREFIX = "Fale em tom animado, natural e dinâmico, em ritmo médio: "  # Prefixo fixo para garantir consistência
SAMPLE_RATE = 24000                     # Taxa de amostragem padrão (24 kHz)
CHANNELS = 1                            # Áudio mono
SAMPWIDTH = 2                           # 16-bit PCM (2 bytes por amostra)
PADDING_SECONDS = 0.3                   # Folga de respiro ao final de cada cena
TARGET_WIDTH = 1080                     # Largura vertical (9:16)
TARGET_HEIGHT = 1920                    # Altura vertical (9:16)
TARGET_FPS = 30                         # Taxa de quadros uniforme


# ==============================================================================
# FUNÇÕES DE VALIDAÇÃO DE AMBIENTE
# ==============================================================================
def verificar_dependencias():
    """Verifica se ffmpeg e ffprobe estão instalados e acessíveis no PATH."""
    faltando = []
    if not shutil.which("ffmpeg"):
        faltando.append("ffmpeg")
    if not shutil.which("ffprobe"):
        faltando.append("ffprobe")

    if faltando:
        print(
            f"ERRO: As seguintes ferramentas não foram encontradas no PATH do sistema: {', '.join(faltando)}.\n"
            "Instale o FFmpeg e certifique-se de que ele esteja configurado nas variáveis de ambiente do Windows.",
            file=sys.stderr,
        )
        sys.exit(1)


def obter_cliente_gemini():
    """Valida a chave de API e instancia o cliente do Google GenAI."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print(
            "ERRO: A variável de ambiente GEMINI_API_KEY não foi encontrada.\n"
            "Configure-a no sistema ou crie um arquivo .env com GEMINI_API_KEY=sua_chave.",
            file=sys.stderr,
        )
        sys.exit(1)

    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except ImportError:
        print(
            "ERRO: O pacote 'google-genai' não está instalado.\n"
            "Execute: pip install google-genai python-dotenv",
            file=sys.stderr,
        )
        sys.exit(1)


def resolver_modelo_tts(client) -> str:
    """
    Resolve o modelo TTS via client.models.list() uma única vez no início do fluxo.
    Verifica se o modelo principal configurado existe; se não, seleciona uma alternativa válida de fallback.
    """
    candidatos_fallback = [
        "gemini-3.8-flash-lite-tts",
        "gemini-3.1-flash-tts-preview",
        "gemini-2.5-flash-preview-tts",
        "gemini-2.5-pro-preview-tts",
    ]
    modelo_resolvido = TTS_MODEL
    usando_fallback = False

    try:
        modelos_disponiveis = [
            m.name.replace("models/", "") for m in client.models.list()
        ]
        if TTS_MODEL in modelos_disponiveis:
            modelo_resolvido = TTS_MODEL
        else:
            encontrado = None
            for cand in candidatos_fallback:
                if cand in modelos_disponiveis:
                    encontrado = cand
                    break
            if not encontrado:
                for m in modelos_disponiveis:
                    if "tts" in m.lower():
                        encontrado = m
                        break
            if encontrado:
                modelo_resolvido = encontrado
                usando_fallback = True
            else:
                modelo_resolvido = TTS_MODEL
    except Exception as e:
        print(f"[AVISO] Falha ao consultar lista de modelos: {e}. Mantendo modelo padrão '{TTS_MODEL}'.")
        modelo_resolvido = TTS_MODEL

    if usando_fallback or modelo_resolvido != TTS_MODEL:
        print(f"[AVISO] Usando modelo de fallback: {modelo_resolvido}")

    print(f"[INFO] Modelo TTS ativo para todas as cenas: {modelo_resolvido}")
    return modelo_resolvido


# ==============================================================================
# OPERAÇÕES DE MÍDIA COM FFPROBE E WAVE
# ==============================================================================
def obter_duracao(caminho_arquivo: str) -> float:
    """Retorna a duração exata de um arquivo de áudio ou vídeo em segundos via ffprobe."""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        caminho_arquivo,
    ]
    try:
        saida = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode("utf-8").strip()
        return float(saida)
    except Exception as e:
        print(f"ERRO ao obter duração de '{caminho_arquivo}': {e}", file=sys.stderr)
        sys.exit(1)


def salvar_pcm_para_wav(dados_audio: bytes, caminho_wav: str, sample_rate: int = SAMPLE_RATE):
    """
    Grava os dados de áudio em formato .wav.
    Se já possuir cabeçalho RIFF WAV grava direto; caso seja PCM bruto (audio/L16),
    utiliza o módulo nativo `wave` (1 canal mono, 16 bits, sample_rate).
    """
    if dados_audio.startswith(b"RIFF"):
        with open(caminho_wav, "wb") as f:
            f.write(dados_audio)
    else:
        with wave.open(caminho_wav, "wb") as wf:
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(SAMPWIDTH)
            wf.setframerate(sample_rate)
            wf.writeframes(dados_audio)


# ==============================================================================
# SÍNTESE DE VOZ (GEMINI TTS) E TRATAMENTO DE RETRY
# ==============================================================================
def eh_erro_transitorio(e: Exception) -> bool:
    """
    Retorna True se o erro for transitório (429, 5xx, timeout, falha de rede).
    Retorna False para erros de cliente (400, 401, 403, 404) e outros não recuperáveis.
    """
    codigo = getattr(e, "code", None) or getattr(e, "status_code", None)
    if codigo is not None and isinstance(codigo, int):
        if codigo in (400, 401, 403, 404):
            return False
        if codigo == 429 or 500 <= codigo < 600:
            return True
        if 400 <= codigo < 500:
            return False

    erros_rede = (
        TimeoutError,
        ConnectionError,
    )
    try:
        import httpx
        erros_rede = erros_rede + (
            httpx.TimeoutException,
            httpx.NetworkError,
            httpx.TransportError,
        )
    except ImportError:
        pass

    if isinstance(e, erros_rede):
        return True

    msg = str(e).lower()
    for err_code in ("400", "401", "403", "404"):
        if err_code in msg:
            return False
    if "429" in msg or "resource_exhausted" in msg or "rate limit" in msg or "quota" in msg:
        return True
    if any(str(c) in msg for c in (500, 502, 503, 504)):
        return True
    if any(termo in msg for termo in ("timeout", "timed out", "connection reset", "connection refused", "network")):
        return True

    return False


def gerar_tts_cena(client, modelo: str, texto_fala: str, caminho_saida_wav: str, numero_cena: int = 1):
    """
    Gera o áudio de uma cena via Gemini TTS com prefixo de estilo e voz consistente.
    Implementa política de retry com até 3 tentativas (1 inicial + 2 retries):
    - Retry SOMENTE em erros transitórios: 429, 5xx e falha de rede/timeout.
    - Erros 400/401/403/404: abortar imediatamente, sem retry.
    - Espera entre tentativas: 2s antes da 2ª, 4s antes da 3ª.
    - Se todas falharem: abortar mostrando em qual cena falhou e o erro completo da última tentativa.
    """
    from google.genai import types

    texto_com_estilo = f"{STYLE_PREFIX}{texto_fala.strip()}"
    config = types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name=VOICE_NAME
                )
            )
        ),
    )

    esperas = {1: 2, 2: 4}
    max_tentativas = 3
    ultimo_erro = None

    for tentativa in range(1, max_tentativas + 1):
        try:
            resposta = client.models.generate_content(
                model=modelo,
                contents=texto_com_estilo,
                config=config,
            )

            partes = resposta.candidates[0].content.parts
            dados_audio = None
            for p in partes:
                if getattr(p, "inline_data", None) and p.inline_data.data:
                    dados_audio = p.inline_data.data
                    break

            if not dados_audio:
                raise ValueError("A resposta da API não conteve dados de áudio válidos.")

            salvar_pcm_para_wav(dados_audio, caminho_saida_wav)
            return

        except Exception as e:
            ultimo_erro = e

            # Erros 400/401/403/404: abortar imediatamente, sem retry
            if not eh_erro_transitorio(e):
                print(
                    f"\n[ERRO FATAL] Erro não transitório ao sintetizar a Cena {numero_cena} (tentativa {tentativa}/{max_tentativas}): {e}",
                    file=sys.stderr,
                )
                print("Operação abortada sem retries adicionais.", file=sys.stderr)
                sys.exit(1)

            # Se for erro transitório e ainda restam tentativas
            if tentativa < max_tentativas:
                espera = esperas.get(tentativa, 2)
                print(
                    f"      [AVISO] Erro transitório na Cena {numero_cena} (tentativa {tentativa}/{max_tentativas}): {e}\n"
                    f"      Aguardando {espera}s antes da tentativa {tentativa + 1}...",
                    file=sys.stderr,
                )
                time.sleep(espera)

    # Se todas as 3 tentativas falharem
    print(
        f"\n[ERRO FATAL] Falha definitiva na síntese de áudio da Cena {numero_cena} após {max_tentativas} tentativas.",
        file=sys.stderr,
    )
    print(f"Erro completo da última tentativa: {ultimo_erro}", file=sys.stderr)
    sys.exit(1)


# ==============================================================================
# FLUXO PRINCIPAL DO MONTADOR
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="Montador de vídeo vertical com Gemini TTS e FFmpeg."
    )
    parser.add_argument(
        "--falas",
        required=True,
        help="Caminho para o arquivo JSON contendo a lista com as 3 falas.",
    )
    parser.add_argument(
        "--clipes",
        nargs=3,
        required=True,
        help="Caminhos para os 3 clipes de vídeo (.mp4) na ordem das cenas.",
    )
    parser.add_argument(
        "--saida",
        required=True,
        help="Caminho do arquivo de vídeo final (.mp4).",
    )

    args = parser.parse_args()

    # 1. Checagem prévia de ambiente e dependências
    verificar_dependencias()
    client = obter_cliente_gemini()
    modelo_tts = resolver_modelo_tts(client)

    # 2. Validação do arquivo de falas
    caminho_falas = Path(args.falas)
    if not caminho_falas.exists():
        print(f"ERRO: Arquivo de falas '{args.falas}' não encontrado.", file=sys.stderr)
        sys.exit(1)

    try:
        with open(caminho_falas, "r", encoding="utf-8") as f:
            falas = json.load(f)
    except Exception as e:
        print(f"ERRO ao ler JSON de falas: {e}", file=sys.stderr)
        sys.exit(1)

    if not isinstance(falas, list) or len(falas) != 3:
        print(
            f"ERRO: O arquivo '{args.falas}' deve conter uma lista JSON com exatamente 3 textos (encontrados: {len(falas) if isinstance(falas, list) else 'formato inválido'}).",
            file=sys.stderr,
        )
        sys.exit(1)

    for i, fala in enumerate(falas):
        if not isinstance(fala, str) or not fala.strip():
            print(f"ERRO: A fala da Cena {i + 1} está vazia ou não é texto.", file=sys.stderr)
            sys.exit(1)

    # 3. Validação da existência dos 3 clipes de vídeo
    for i, clipe in enumerate(args.clipes):
        if not Path(clipe).exists():
            print(f"ERRO: Clipe da Cena {i + 1} '{clipe}' não foi encontrado.", file=sys.stderr)
            sys.exit(1)

    # Criar diretório temporário para os arquivos intermediários
    temp_dir = Path(tempfile.mkdtemp(prefix="montador_temp_"))
    sucesso = False

    try:
        print("========================================================")
        print("          MONTADOR DE VÍDEO VERTICAL (SHOPEE)")
        print(f"  Modelo TTS: {modelo_tts} | Voz: {VOICE_NAME}")
        print("========================================================\n")

        audios_wav = []
        duracoes_audio = []

        # ETAPA 1: Gerar TTS para cada uma das 3 cenas
        for i, fala in enumerate(falas):
            caminho_wav = str(temp_dir / f"audio_cena_{i + 1}.wav")
            print(f"[1/5] Sintetizando voz da Cena {i + 1} via Gemini TTS...")
            gerar_tts_cena(client, modelo_tts, fala, caminho_wav, numero_cena=i + 1)

            # ETAPA 2: Medir duração do áudio com ffprobe
            dur_audio = obter_duracao(caminho_wav)
            audios_wav.append(caminho_wav)
            duracoes_audio.append(dur_audio)
            print(f"      -> Áudio gerado: {dur_audio:.2f}s")

        # ETAPA 3: Medir duração dos clipes e VALIDAR (áudio + PADDING_SECONDS > clipe)
        print("\n[2/5] Validando compatibilidade de duração entre áudio e vídeo...")
        duracoes_clipes = []
        for i, clipe in enumerate(args.clipes):
            dur_clipe = obter_duracao(clipe)
            duracoes_clipes.append(dur_clipe)
            dur_audio = duracoes_audio[i]
            dur_necessaria = dur_audio + PADDING_SECONDS

            if dur_necessaria > dur_clipe:
                segundos_faltantes = dur_necessaria - dur_clipe
                print("\n" + "=" * 65, file=sys.stderr)
                print(f"ERRO DE COMPATIBILIDADE NA CENA {i + 1}:", file=sys.stderr)
                print(f"- Fala gerada: {dur_audio:.2f}s (+ {PADDING_SECONDS}s de folga = {dur_necessaria:.2f}s necessários)", file=sys.stderr)
                print(f"- Clipe de vídeo disponível: {dur_clipe:.2f}s", file=sys.stderr)
                print(f"- Faltam {segundos_faltantes:.2f}s de vídeo no clipe correspondente.", file=sys.stderr)
                print("A montagem foi interrompida para evitar cortes abruptos ou imagens congeladas.", file=sys.stderr)
                print("DICA: Encurte o texto da fala ou gere um clipe mais longo no Veo.", file=sys.stderr)
                print("=" * 65 + "\n", file=sys.stderr)
                sys.exit(1)

            print(f"      Cena {i + 1}: Áudio={dur_audio:.2f}s (corte={dur_necessaria:.2f}s) | Clipe={dur_clipe:.2f}s -> [OK]")

        # ETAPA 4: Cortar a partir do início, remover áudio nativo (-an) e normalizar vídeo
        print("\n[3/5] Cortando e normalizando os 3 clipes de vídeo...")
        clipes_processados = []
        for i, clipe in enumerate(args.clipes):
            dur_corte = duracoes_audio[i] + PADDING_SECONDS
            clipe_saida = str(temp_dir / f"clip_norm_{i + 1}.mp4")

            # Filtro: escala e crop central para 1080x1920 (9:16), 30 fps, libx264
            vf_filter = (
                f"scale={TARGET_WIDTH}:{TARGET_HEIGHT}:force_original_aspect_ratio=increase,"
                f"crop={TARGET_WIDTH}:{TARGET_HEIGHT},setsar=1"
            )

            cmd_video = [
                "ffmpeg",
                "-y",
                "-ss", "0",
                "-t", f"{dur_corte:.4f}",
                "-i", clipe,
                "-an",
                "-vf", vf_filter,
                "-r", str(TARGET_FPS),
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                clipe_saida,
            ]
            subprocess.run(cmd_video, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            clipes_processados.append(clipe_saida)
            print(f"      -> Clipe {i + 1} processado ({dur_corte:.2f}s, 1080x1920, 30fps)")

        # Padronizar áudios adicionando a folga de silêncio (PADDING_SECONDS) no final de cada cena
        print("\n[4/5] Ajustando e sincronizando faixas de áudio...")
        audios_ajustados = []
        for i, audio in enumerate(audios_wav):
            audio_pad = str(temp_dir / f"audio_pad_{i + 1}.wav")
            cmd_audio = [
                "ffmpeg",
                "-y",
                "-i", audio,
                "-af", f"apad=pad_dur={PADDING_SECONDS:.3f}",
                audio_pad,
            ]
            subprocess.run(cmd_audio, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            audios_ajustados.append(audio_pad)

        # ETAPA 5: Concatenação dos clipes, concatenação dos áudios e Muxing Final
        print("\n[5/5] Realizando concatenação e montagem final do vídeo...")

        # Criar arquivo de lista para concat demuxer do vídeo
        lista_videos_txt = temp_dir / "videos.txt"
        with open(lista_videos_txt, "w", encoding="utf-8") as f:
            for c in clipes_processados:
                # Normalizar barras para o FFmpeg
                c_posix = Path(c).as_posix()
                f.write(f"file '{c_posix}'\n")

        # Criar arquivo de lista para concat demuxer do áudio
        lista_audios_txt = temp_dir / "audios.txt"
        with open(lista_audios_txt, "w", encoding="utf-8") as f:
            for a in audios_ajustados:
                a_posix = Path(a).as_posix()
                f.write(f"file '{a_posix}'\n")

        video_unificado = str(temp_dir / "video_concat.mp4")
        cmd_concat_v = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(lista_videos_txt),
            "-c", "copy",
            video_unificado,
        ]
        subprocess.run(cmd_concat_v, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        audio_unificado = str(temp_dir / "audio_concat.wav")
        cmd_concat_a = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(lista_audios_txt),
            "-c", "copy",
            audio_unificado,
        ]
        subprocess.run(cmd_concat_a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Mux final com -c:v copy, -c:a aac, -shortest e -movflags +faststart
        caminho_final = Path(args.saida).resolve()
        caminho_final.parent.mkdir(parents=True, exist_ok=True)

        cmd_mux_final = [
            "ffmpeg",
            "-y",
            "-i", video_unificado,
            "-i", audio_unificado,
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            "-movflags", "+faststart",
            str(caminho_final),
        ]
        subprocess.run(cmd_mux_final, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        duracao_final = obter_duracao(str(caminho_final))
        print("\n========================================================")
        print("          VÍDEO FINAL MONTADO COM SUCESSO!")
        print(f"  Arquivo: {caminho_final}")
        print(f"  Duração: {duracao_final:.2f}s | Resolução: {TARGET_WIDTH}x{TARGET_HEIGHT} (9:16)")
        print(f"  Áudio: AAC estéreo | Vídeo: H.264 (30 fps)")
        print("========================================================\n")
        sucesso = True

    finally:
        # Apagar arquivos temporários apenas em caso de sucesso
        if sucesso and temp_dir.exists():
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass


if __name__ == "__main__":
    main()
