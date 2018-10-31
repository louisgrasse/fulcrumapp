#!/bin/sh

apt-get update

GITHUB_FEED="https://api.github.com/repos/fulcrumapp/fulcrum-desktop/releases/latest"

VERSION=$(curl -s "$GITHUB_FEED" | grep '"name":' | head -n 1 | sed -e '1s/  "name": "//' | sed -e '1s/",//')

DEB_FILE="Fulcrum_${VERSION}_amd64.deb"

DOWNLOAD_URL="https://github.com/fulcrumapp/fulcrum-desktop/releases/download/v${VERSION}/${DEB_FILE}"

UBUNTU_VERSION=$(lsb_release -sr)

cd ~

curl -L $DOWNLOAD_URL -o $DEB_FILE

# these 2 packages are needed for Ubuntu 16.04
if [ $UBUNTU_VERSION == '16.04' ]
then
    sudo apt-get install -y libasound2 libcurl4-openssl-dev

# older libcurl needed for Ubuntu 18.04
elif [ $UBUNTU_VERSION == '18.04' ]
then
    echo "deb http://security.ubuntu.com/ubuntu xenial-security main" | sudo tee -a /etc/apt/sources.list
    sudo apt-get install -y libasound2 libcurl3
fi

dpkg -i $DEB_FILE

apt-get install -f

echo "Fulcrum successfully installed to /opt/Fulcrum"
echo "To get started, run:"
echo "  /opt/Fulcrum/scripts/fulcrum setup"
