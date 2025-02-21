class GitBarber < Formula
    include Language::Python::Virtualenv

    desc "CLI tool to manage Git branches and files"
    homepage "https://github.com/kfirprods/git-barber"
    url "https://files.pythonhosted.org/packages/source/g/git-barber/git-barber-0.1.0.tar.gz"
    sha256 "80917f77388f105a90d817340812ff30f1caec64400151f43dd901fea1a80bdb"

    depends_on "python"

    resource "click" do
        url "https://files.pythonhosted.org/packages/source/c/click/click-8.1.8.tar.gz"
        sha256 "ed53c9d8990d83c2a27deae68e4ee337473f6330c040a31d4225c9574d16096a"
    end
    
    resource "GitPython" do
        url "https://files.pythonhosted.org/packages/source/g/gitpython/GitPython-3.1.44.tar.gz"
        sha256 "c87e30b26253bf5418b01b0660f818967f3c503193838337fe5e573331249269"
    end
    
    resource "inquirer" do
        url "https://files.pythonhosted.org/packages/source/i/inquirer/inquirer-3.4.0.tar.gz"
        sha256 "8edc99c076386ee2d2204e5e3653c2488244e82cb197b2d498b3c1b5ffb25d0b"
    end

    def install
      virtualenv_install_with_resources
    end

    test do
      system "#{bin}/git-barber", "--help"
    end
  end