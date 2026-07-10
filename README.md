# luci-app-huawei-hilink-status

A LuCI dashboard for Huawei HiLink LTE modems on OpenWrt.

The application shows signal parameters, connection health, traffic statistics and history, and provides modem controls. The interface automatically follows the language selected in LuCI: Russian or English.

> Tested on OpenWrt 25.12.4 with a Huawei HiLink modem available at `http://192.168.8.1`.

## Features

- LTE signal: RSSI, RSRP, RSRQ and SINR
- Operator, network and connection status
- Current and total traffic statistics
- Signal and speed history
- Connection health checks
- Reconnect and data controls
- Responsive LuCI interface
- Automatic Russian/English interface

## Install a ready package

Download the latest `.apk` file from **Releases**, copy it to `/tmp` on the router, then run:

```sh
apk add --allow-untrusted /tmp/luci-app-huawei-hilink-status-*.apk
```

After installation, refresh LuCI and open **Huawei LTE**.

The package is built outside the official OpenWrt repositories, so installation uses `--allow-untrusted`.

## Remove

```sh
apk del luci-app-huawei-hilink-status
```

## Build on Ubuntu

```sh
git clone https://github.com/kucher13/luci-app-huawei-hilink-status.git
cd luci-app-huawei-hilink-status
chmod +x build-on-ubuntu.sh
./build-on-ubuntu.sh
```

The resulting package and checksum will be placed in `result/`.

## Build inside an OpenWrt tree or SDK

Copy this repository to:

```text
package/luci-app-huawei-hilink-status
```

Then run:

```sh
make package/luci-app-huawei-hilink-status/compile V=s
```

## Modem address

The backend uses this default address:

```text
http://192.168.8.1
```

It can also be overridden for direct backend calls with the `HUAWEI_BASE` environment variable.

## Compatibility

- OpenWrt 25.12+ (`apk` package format)
- LuCI with `rpcd-mod-file`
- Huawei HiLink API compatible modems

Compatibility with every Huawei firmware is not guaranteed because API responses differ between models and firmware versions.

## Русский

Это LuCI-интерфейс для модемов Huawei HiLink. Он показывает параметры сигнала, состояние подключения, трафик и историю, а также позволяет выполнять основные действия с модемом. Язык автоматически зависит от выбранного языка LuCI.

Установка готового пакета:

```sh
apk add --allow-untrusted /tmp/luci-app-huawei-hilink-status-*.apk
```

После установки обновите страницу LuCI и откройте раздел **Huawei LTE**.

## License

MIT
