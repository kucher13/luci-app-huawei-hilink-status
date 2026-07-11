include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-huawei-hilink-status
PKG_VERSION:=1.0.1
PKG_RELEASE:=1
PKG_LICENSE:=MIT
PKG_MAINTAINER:=kucher13
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-huawei-hilink-status
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=Huawei HiLink LTE status dashboard
  DEPENDS:=+luci-base +rpcd-mod-file +curl
endef

define Package/luci-app-huawei-hilink-status/description
 A LuCI dashboard for Huawei HiLink LTE modems. It displays signal quality,
 traffic statistics, connection health and history, and provides modem controls.
 The interface follows the language selected in LuCI (Russian or English).
endef

define Build/Compile
endef

define Package/luci-app-huawei-hilink-status/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/usr/bin/huawei $(1)/usr/bin/huawei

	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/huawei
	$(INSTALL_DATA) ./files/www/luci-static/resources/view/huawei/lte_clean.js \
		$(1)/www/luci-static/resources/view/huawei/lte_clean.js

	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./files/usr/share/luci/menu.d/luci-app-huawei-lte.json \
		$(1)/usr/share/luci/menu.d/luci-app-huawei-lte.json

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./files/usr/share/rpcd/acl.d/luci-app-huawei-lte.json \
		$(1)/usr/share/rpcd/acl.d/luci-app-huawei-lte.json
endef

define Package/luci-app-huawei-hilink-status/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	rm -rf /tmp/luci-* /tmp/luci-indexcache* /tmp/luci-modulecache* 2>/dev/null || true
	[ ! -x /etc/init.d/rpcd ] || /etc/init.d/rpcd restart
	[ ! -x /etc/init.d/uhttpd ] || /etc/init.d/uhttpd reload
}
exit 0
endef

define Package/luci-app-huawei-hilink-status/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	rm -rf /tmp/luci-* /tmp/luci-indexcache* /tmp/luci-modulecache* 2>/dev/null || true
}
exit 0
endef

$(eval $(call BuildPackage,luci-app-huawei-hilink-status))
