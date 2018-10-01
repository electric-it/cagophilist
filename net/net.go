package net // import "electric-it.io/cago"

import (
	"crypto/tls"
	"net"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"

	"github.com/apex/log"
	"github.com/spf13/viper"
	"golang.org/x/net/publicsuffix"
)

// GetHTTPClient returns the HTTP client that should be used in Cago
func GetHTTPClient() *http.Client {
	// Initialize the default transport
	initDefaultTransport()

	options := &cookiejar.Options{
		PublicSuffixList: publicsuffix.List,
	}

	jar, newCookieJarError := cookiejar.New(options)
	if newCookieJarError != nil {
		log.Fatalf("Error creating new cookie jar: %s", newCookieJarError)
	}

	httpClient := &http.Client{
		Jar: jar,
	}

	return httpClient
}

func initDefaultTransport() {
	log.Debug("Initializing default HTTP transport")

	// Grab a pointer to the default transport so we can modify it
	var defaultTransport = http.DefaultTransport.(*http.Transport)

	// Check to see if the user wants to ignore the proxies in the configuration file
	if !ignoreProxyConfiguration() {
		// See if we can find a working proxy in the configuration file
		foundGoodProxyURL, proxyURL := getProxyURL()
		if foundGoodProxyURL {
			log.Debugf("Using proxy from configuration file: %s", proxyURL.String())
			defaultTransport.Proxy = http.ProxyURL(proxyURL)
		}
	}

	// Create a new client config if not already existing
	if defaultTransport.TLSClientConfig == nil {
		defaultTransport.TLSClientConfig = new(tls.Config)
	}

	// TODO: This should be set based on the flag
	defaultTransport.TLSClientConfig.InsecureSkipVerify = true
}

// ignoreProxyConfiguration returns true if proxy configuration should be ignored; false otherwise
func ignoreProxyConfiguration() bool {
	// Ignore the proxy configuration if HTTP_PROXY environment variable has been set
	if _, ok := os.LookupEnv("HTTP_PROXY"); ok {
		log.Info("Ignoring proxies in the configuration file because HTTP_PROXY environment variable was set")
		return true
	}

	// Ignore the proxy configuration if http_proxy environment variable has been set
	if _, ok := os.LookupEnv("http_proxy"); ok {
		log.Info("Ignoring proxies in the configuration file because http_proxy environment variable was set")
		return true
	}

	// Ignore the proxy configuration if the user has set the ignore-proxy-config flag
	if viper.GetBool("ignore-proxy-config") {
		log.Info("Ignoring proxies in the configuration file because 'ignore-proxy-config' flag was set")
		return true
	}

	return false
}

// getProxyURLFromConfiguration return the first working proxy URL from the configuration file
func getProxyURL() (bool, *url.URL) {
	// Grab the list of HTTP proxies from the configuration
	log.Debug("Attempting to use one of the proxies defined in the configuration file")
	httpProxyStringMap := viper.GetStringMap("HTTPProxies")

	// This will be set to the URL to use or remain nil
	var proxyURL *url.URL

	// Try each proxy and use it if it's available
	for proxyAlias, httpProxy := range httpProxyStringMap {
		proxyURLString := httpProxy.(map[string]interface{})["proxyurl"]
		if proxyURLString == nil {
			log.Warnf("The proxy entry %s needs a ProxyURL in the configuration file: %s", proxyAlias, httpProxy)
			continue
		}

		log.Debugf("Checking access to proxy: %s", proxyURLString)

		var parseError error
		proxyURL, parseError = url.Parse(proxyURLString.(string))
		if parseError != nil {
			log.Debugf("Skipping proxy URL that couldn't be parsed: %s", parseError)
			continue
		}

		// Get the proxy hostname
		proxyHost := proxyURL.Hostname()

		// Try looking up the hostname IP
		log.Debugf("Looking up IP address for: %s", proxyHost)
		_, lookupError := net.LookupHost(proxyHost)
		if lookupError != nil {
			log.Debugf("Skipping proxy because the IP lookup failed: %s", proxyHost)
			continue
		}

		// Get the proxy hostname
		proxyPort := proxyURL.Port()

		// Try connecting to the proxy port
		log.Debugf("Attempting to connect to %s on port %s", proxyHost, proxyPort)
		connection, dialError := net.Dial("tcp", proxyHost+":"+proxyPort)
		if dialError != nil {
			log.Debugf("Unable to connect to proxy %s on port %s", proxyHost, proxyPort)
			continue
		}
		err := connection.Close()
		if err != nil {
			log.Fatalf("Unable to close connection to proxy host: %s", err)
		}

		// Set the no proxy based on this config... this may be futile, need more research
		noProxy := httpProxy.(map[string]interface{})["noproxy"]
		if noProxy != nil {
			log.Debugf("Setting NO_PROXY to %s", noProxy)
			err := os.Setenv("NO_PROXY", noProxy.(string))
			if err != nil {
				log.Fatalf("Unable to set NO_PROXY environment variable: %s", err)
			}
		}

		// If we made it this far, the proxy is usable
		log.Infof("Found a working proxy from the configuration file: %s on port %s", proxyHost, proxyPort)
		return true, proxyURL
	}

	return false, proxyURL
}
