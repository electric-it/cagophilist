package net_test // import "electric-it.io/cago"

import (
	"os"
	"testing"

	"github.com/apex/log"
	"github.com/spf13/viper"

	"electric-it.io/cago/net"
)

func TestGetHttpClient(t *testing.T) {
	log.SetLevel(log.DebugLevel)

	{
		httpClient := net.GetHTTPClient()
		if httpClient == nil {
			t.Fatal("Couldn't get HTTP client")
		}
	}

	{
		viper.Set("ignore-proxy-config", true)

		httpClient := net.GetHTTPClient()
		if httpClient == nil {
			t.Fatal("Couldn't get HTTP client")
		}
	}

	{
		os.Setenv("http_proxy", "blah")

		httpClient := net.GetHTTPClient()
		if httpClient == nil {
			t.Fatal("Couldn't get HTTP client")
		}
	}

	{
		os.Setenv("HTTP_PROXY", "blah")

		httpClient := net.GetHTTPClient()
		if httpClient == nil {
			t.Fatal("Couldn't get HTTP client")
		}
	}

	{
		proxyMap := map[string]string{}

		viper.Set("HTTPProxies", proxyMap)

		httpClient := net.GetHTTPClient()
		if httpClient == nil {
			t.Fatal("Couldn't get HTTP client")
		}
	}

	{
		viper.Reset()
		os.Unsetenv("HTTP_PROXY")
		os.Unsetenv("http_proxy")

		proxyMap := map[string]string{}
		proxyMap["proxy"] = "no-worky"

		viper.Set("HTTPProxies", proxyMap)

		httpClient := net.GetHTTPClient()
		if httpClient == nil {
			t.Fatal("Couldn't get HTTP client")
		}
	}

}
